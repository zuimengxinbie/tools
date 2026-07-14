#requires -Version 5.1

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$ProtocolUri,

    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Quiet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$HostAddress = "127.0.0.1"
$Port = 8000
$AppUrl = "http://${HostAddress}:${Port}/#/business/cashier"
$HealthUrl = "http://${HostAddress}:${Port}/favicon.ico"
$LocalRoot = Join-Path $env:LOCALAPPDATA "cq-tools"
$RuntimeDir = Join-Path $LocalRoot "runtime"
$LogDir = Join-Path $LocalRoot "logs"
$StateFile = Join-Path $RuntimeDir "server.json"
$LockFile = Join-Path $RuntimeDir "launcher.lock"
$ProtocolKey = "HKCU:\Software\Classes\cqtools"

New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Show-LauncherMessage {
    param(
        [string]$Message,
        [string]$Title = "CQ Tools",
        [ValidateSet("Information", "Warning", "Error")]
        [string]$Icon = "Information"
    )

    if ($Quiet) {
        Write-Host "${Title}: ${Message}"
        return
    }

    try {
        Add-Type -AssemblyName PresentationFramework
        $image = [System.Windows.MessageBoxImage]::$Icon
        [System.Windows.MessageBox]::Show(
            $Message,
            $Title,
            [System.Windows.MessageBoxButton]::OK,
            $image
        ) | Out-Null
    }
    catch {
        Write-Host "${Title}: ${Message}"
    }
}

function Write-LauncherLog {
    param([string]$Message)

    $launcherLog = Join-Path $LogDir "launcher.log"
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -LiteralPath $launcherLog -Value $line -Encoding UTF8
}

function Get-PortOwnerProcess {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalAddress -in @($HostAddress, "0.0.0.0", "::", "::1") } |
        Select-Object -First 1

    if (-not $connection) {
        return $null
    }

    return Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
}

function Test-ProjectServerProcess {
    param($ProcessInfo)

    if (-not $ProcessInfo) {
        return $false
    }

    $commandLine = [string]$ProcessInfo.CommandLine
    $isNode = [string]$ProcessInfo.Name -ieq "node.exe"
    $containsProject = $commandLine.IndexOf($ProjectRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0
    $containsVite = $commandLine.IndexOf("vite", [StringComparison]::OrdinalIgnoreCase) -ge 0
    return $isNode -and $containsProject -and $containsVite
}

function Test-AppReady {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $HealthUrl -TimeoutSec 2
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

function Save-ServerState {
    param(
        [int]$LauncherPid,
        [int]$ServerPid,
        [string]$StandardOutput,
        [string]$StandardError
    )

    $state = [ordered]@{
        projectRoot = $ProjectRoot
        host = $HostAddress
        port = $Port
        launcherPid = $LauncherPid
        serverPid = $ServerPid
        startedAt = (Get-Date).ToString("o")
        standardOutput = $StandardOutput
        standardError = $StandardError
    }
    $state | ConvertTo-Json | Set-Content -LiteralPath $StateFile -Encoding UTF8
}

function Remove-ServerState {
    if (Test-Path -LiteralPath $StateFile) {
        Remove-Item -LiteralPath $StateFile -Force -ErrorAction SilentlyContinue
    }
}

function Open-AppPage {
    if (-not $Quiet) {
        Start-Process $AppUrl
    }
}

function Start-App {
    $owner = Get-PortOwnerProcess
    if ($owner) {
        if (Test-ProjectServerProcess $owner) {
            if (Test-AppReady) {
                Open-AppPage
                return
            }
            throw "项目服务占用了端口，但暂时无法访问。请稍后重试；如持续失败，请先停止服务。"
        }
        throw "端口 ${Port} 已被其他程序占用（PID $($owner.ProcessId)）。为避免影响其他程序，本启动器不会结束该进程。"
    }

    $packageFile = Join-Path $ProjectRoot "package.json"
    $nodeModules = Join-Path $ProjectRoot "node_modules"
    if (-not (Test-Path -LiteralPath $packageFile)) {
        throw "项目文件不完整：未找到 package.json。"
    }
    if (-not (Test-Path -LiteralPath $nodeModules)) {
        throw "项目依赖尚未安装。请联系维护人员在项目目录执行 pnpm install。"
    }

    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    $pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        throw "未找到 Node.js。请联系维护人员安装项目要求的 Node.js。"
    }
    if (-not $pnpmCommand) {
        throw "未找到 pnpm。请联系维护人员安装 pnpm。"
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $stdout = Join-Path $LogDir "server-${timestamp}.out.log"
    $stderr = Join-Path $LogDir "server-${timestamp}.err.log"
    $arguments = @(
        "dev",
        "--host", $HostAddress,
        "--port", [string]$Port,
        "--strictPort"
    )
    if (-not $Quiet) {
        $arguments += @("--open", "/#/business/cashier")
    }

    Write-LauncherLog "Starting project from $ProjectRoot"
    $launcherProcess = Start-Process `
        -FilePath $pnpmCommand.Source `
        -ArgumentList $arguments `
        -WorkingDirectory $ProjectRoot `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -WindowStyle Hidden `
        -PassThru

    $deadline = (Get-Date).AddSeconds(30)
    do {
        Start-Sleep -Milliseconds 500
        $owner = Get-PortOwnerProcess
        if ($owner -and (Test-ProjectServerProcess $owner) -and (Test-AppReady)) {
            Save-ServerState `
                -LauncherPid $launcherProcess.Id `
                -ServerPid $owner.ProcessId `
                -StandardOutput $stdout `
                -StandardError $stderr
            Write-LauncherLog "Project is ready on $AppUrl (PID $($owner.ProcessId))"
            return
        }
    } while ((Get-Date) -lt $deadline)

    if (-not $launcherProcess.HasExited) {
        Stop-Process -Id $launcherProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-ServerState
    throw "项目在 30 秒内未能启动。请将日志发给维护人员：`n${stdout}`n${stderr}"
}

function Stop-App {
    param([switch]$Silent)

    $owner = Get-PortOwnerProcess
    if (-not $owner) {
        Remove-ServerState
        if (-not $Silent) {
            Show-LauncherMessage -Message "项目当前未运行。" -Icon Information
        }
        return
    }

    if (-not (Test-ProjectServerProcess $owner)) {
        throw "端口 ${Port} 由其他程序占用（PID $($owner.ProcessId)），启动器不会结束该进程。"
    }

    Write-LauncherLog "Stopping project server PID $($owner.ProcessId)"
    Stop-Process -Id $owner.ProcessId -Force
    $deadline = (Get-Date).AddSeconds(8)
    do {
        Start-Sleep -Milliseconds 250
    } while ((Get-PortOwnerProcess) -and (Get-Date) -lt $deadline)

    if (Get-PortOwnerProcess) {
        throw "服务未能正常停止。请查看日志或联系维护人员。"
    }

    Remove-ServerState
    if (-not $Silent) {
        Show-LauncherMessage -Message "项目已停止。" -Icon Information
    }
}

function Install-EntryProtocol {
    $powerShellPath = (Get-Command powershell.exe).Source
    $scriptPath = [IO.Path]::GetFullPath($PSCommandPath)
    $handler = '"{0}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{1}" "%1"' -f $powerShellPath, $scriptPath

    New-Item -Path $ProtocolKey -Force | Out-Null
    Set-Item -Path $ProtocolKey -Value "URL:CQ Tools Launcher"
    New-ItemProperty -Path $ProtocolKey -Name "URL Protocol" -Value "" -PropertyType String -Force | Out-Null
    New-Item -Path (Join-Path $ProtocolKey "shell\open\command") -Force | Out-Null
    Set-Item -Path (Join-Path $ProtocolKey "shell\open\command") -Value $handler

    Write-LauncherLog "Registered cqtools protocol for $scriptPath"
    Show-LauncherMessage -Message "一键启动入口安装成功。`n`n以后直接打开 ENTRY.html，点击按钮即可启动或停止项目。" -Icon Information
    if (-not $Quiet) {
        Start-Process (Join-Path $ProjectRoot "ENTRY.html")
    }
}

function Uninstall-EntryProtocol {
    Stop-App -Silent
    if (Test-Path -LiteralPath $ProtocolKey) {
        Remove-Item -LiteralPath $ProtocolKey -Recurse -Force
    }
    Remove-ServerState
    if (Test-Path -LiteralPath $LockFile) {
        Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
    }
    Write-LauncherLog "Unregistered cqtools protocol"
    Show-LauncherMessage -Message "一键启动入口已卸载。项目文件和业务数据没有被删除。" -Icon Information
}

try {
    if ($Install) {
        Install-EntryProtocol
        exit 0
    }
    if ($Uninstall) {
        Uninstall-EntryProtocol
        exit 0
    }

    if ($ProtocolUri -notmatch '^cqtools://(start|open|stop)(?:[/?#].*)?$') {
        throw "不支持的启动命令。"
    }
    $action = $Matches[1].ToLowerInvariant()

    $lockStream = $null
    try {
        $lockStream = [IO.File]::Open(
            $LockFile,
            [IO.FileMode]::OpenOrCreate,
            [IO.FileAccess]::ReadWrite,
            [IO.FileShare]::None
        )

        switch ($action) {
            "start" { Start-App }
            "open" { Start-App }
            "stop" { Stop-App }
        }
    }
    catch [IO.IOException] {
        Show-LauncherMessage -Message "另一个启动或停止操作正在进行，请稍后再试。" -Icon Warning
    }
    finally {
        if ($lockStream) {
            $lockStream.Dispose()
        }
    }
}
catch {
    Write-LauncherLog "ERROR: $($_.Exception.Message)"
    Show-LauncherMessage -Message $_.Exception.Message -Title "CQ Tools 启动失败" -Icon Error
    exit 1
}
