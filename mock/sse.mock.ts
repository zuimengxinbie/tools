import { defineMock } from "./base";

/**
 * SSE 长连接 Mock
 *
 * 接口：GET /api/v1/sse/connect
 * 作用：避免后端未实现时前端控制台出现 401 / 重连日志。
 *
 * 实现方式：
 * - 返回标准 SSE 响应头（text/event-stream）
 * - 发送一条 `connected` 事件
 * - 每 30 秒发送一次注释行作为心跳，保持连接存活
 * - 客户端关闭时自动清理定时器
 */
export default defineMock([
  {
    url: "sse/connect",
    method: ["GET"],
    response(req, res) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.statusCode = 200;

      // 初始连接成功事件
      res.write(`event: connected\n`);
      res.write(`data: ${JSON.stringify({ message: "SSE mock connected" })}\n\n`);

      // 心跳，防止连接被中间件/浏览器超时关闭
      const heartbeat = setInterval(() => {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      }, 30000);

      // 示例：每 60 秒推送一次在线用户数（和 useOnlineCount 的订阅事件名保持一致）
      // data 直接为数字，匹配 handleOnlineCountMessage(count: number) 的期望
      const pushOnlineCount = () => {
        res.write(`event: online-count\n`);
        res.write(`data: 1\n\n`);
      };
      pushOnlineCount(); // 立即推一条，避免首页一直显示 0
      const onlineTimer = setInterval(pushOnlineCount, 60000);

      req.on("close", () => {
        clearInterval(heartbeat);
        clearInterval(onlineTimer);
        res.end();
      });
    },
  },
]);
