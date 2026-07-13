<template>
  <div v-loading="store.loading" class="inventory-page">
    <header class="page-header">
      <div>
        <p>PRODUCT & INVENTORY</p>
        <h1>商品与库存</h1>
        <span>维护菜单、售价和每日备货量</span>
      </div>
      <el-button type="primary" size="large" :icon="Plus" @click="openProductDialog()">
        新增商品
      </el-button>
    </header>

    <section class="metric-grid">
      <article>
        <span class="metric-icon is-green">
          <el-icon><Goods /></el-icon>
        </span>
        <div>
          <small>商品总数</small>
          <strong>{{ store.products.length }}</strong>
        </div>
      </article>
      <article>
        <span class="metric-icon is-blue">
          <el-icon><CircleCheck /></el-icon>
        </span>
        <div>
          <small>在售商品</small>
          <strong>{{ store.activeProducts.length }}</strong>
        </div>
      </article>
      <article>
        <span class="metric-icon is-orange">
          <el-icon><Warning /></el-icon>
        </span>
        <div>
          <small>可售库存预警</small>
          <strong>{{ lowStockCount }}</strong>
        </div>
      </article>
      <article>
        <span class="metric-icon is-brown">
          <el-icon><Box /></el-icon>
        </span>
        <div>
          <small>实物总库存</small>
          <strong>{{ totalStock }}</strong>
        </div>
      </article>
    </section>

    <section class="content-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="商品库存" name="products">
          <div class="table-toolbar">
            <el-input
              v-model="keyword"
              class="search-input"
              :prefix-icon="Search"
              clearable
              placeholder="搜索商品名称"
            />
            <el-select v-model="categoryFilter" class="category-filter">
              <el-option label="全部分类" value="全部" />
              <el-option v-for="item in store.categories" :key="item" :label="item" :value="item" />
            </el-select>
            <span>可售库存低于预警值时会醒目标红</span>
          </div>

          <el-table :data="filteredProducts" :row-class-name="getRowClassName" table-layout="fixed">
            <el-table-column label="商品" min-width="210">
              <template #default="{ row }">
                <div class="product-cell">
                  <span>
                    <el-icon><Coffee /></el-icon>
                  </span>
                  <div>
                    <strong>{{ row.name }}</strong>
                    <small>ID · {{ shortId(row.id) }}</small>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="分类" min-width="110" />
            <el-table-column label="售价" min-width="110">
              <template #default="{ row }">
                <strong>¥{{ formatMoney(row.price) }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="实物库存" min-width="105">
              <template #default="{ row }">
                <div class="stock-cell">
                  <strong>{{ row.stock }}</strong>
                  <span>份</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="预留库存" min-width="105">
              <template #default="{ row }">
                <div class="stock-cell is-reserved">
                  <strong>{{ row.reservedStock }}</strong>
                  <span>份</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="可售库存" min-width="145">
              <template #default="{ row }">
                <div class="stock-cell">
                  <strong>{{ row.availableStock }}</strong>
                  <span>份</span>
                  <el-tag
                    v-if="row.availableStock <= row.warningStock"
                    type="danger"
                    size="small"
                    effect="light"
                  >
                    库存偏低
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="plain" round>
                  {{ row.status === 1 ? "上架" : "下架" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="350" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" plain :icon="Box" @click="openRestockDialog(row)">
                  入库
                </el-button>
                <el-button text :icon="SetUp" @click="openAdjustmentDialog(row)">调整</el-button>
                <el-button text :icon="Edit" @click="openProductDialog(row)">编辑</el-button>
                <el-button
                  text
                  :type="row.status === 1 ? 'danger' : 'success'"
                  @click="toggleProduct(row)"
                >
                  {{ row.status === 1 ? "下架" : "上架" }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="预定管理" name="reservations">
          <ReservationManager />
        </el-tab-pane>

        <el-tab-pane label="库存流水" name="movements" lazy>
          <StockMovementTable />
        </el-tab-pane>

        <el-tab-pane label="分类管理" name="categories">
          <div class="category-manager">
            <div class="category-manager__intro">
              <h2>菜单分类</h2>
              <p>分类会作为收银台的快捷筛选标签。重命名后，分类下的商品会自动同步。</p>
              <div class="category-manager__add">
                <el-input
                  v-model="newCategory"
                  maxlength="12"
                  placeholder="输入新分类名称"
                  @keyup.enter="addCategory"
                />
                <el-button type="primary" :icon="Plus" @click="addCategory">添加分类</el-button>
              </div>
            </div>
            <div class="category-list">
              <article v-for="(category, index) in store.categories" :key="category">
                <span class="category-list__index">{{ String(index + 1).padStart(2, "0") }}</span>
                <div>
                  <strong>{{ category }}</strong>
                  <small>{{ productCountByCategory(category) }} 个商品</small>
                </div>
                <el-button text :icon="Edit" @click="renameCategory(category)">重命名</el-button>
                <el-button text type="danger" :icon="Delete" @click="deleteCategory(category)">
                  删除
                </el-button>
              </article>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <el-dialog
      v-model="productDialogVisible"
      :title="editingProductId ? '编辑商品' : '新增商品'"
      width="520px"
      destroy-on-close
    >
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="商品名称" class="is-wide" required>
            <el-input v-model="productForm.name" maxlength="20" placeholder="例如：冰美式" />
          </el-form-item>
          <el-form-item label="商品分类" required>
            <el-select v-model="productForm.category" placeholder="请选择分类">
              <el-option v-for="item in store.categories" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="销售价格" required>
            <el-input-number v-model="productForm.price" :min="0.01" :precision="2" :step="1" />
          </el-form-item>
          <el-form-item v-if="!editingProductId" label="初始库存" required>
            <el-input-number v-model="productForm.stock" :min="0" :max="9999" />
          </el-form-item>
          <el-form-item label="预警库存" required>
            <el-input-number v-model="productForm.warningStock" :min="0" :max="999" />
          </el-form-item>
        </div>
        <div v-if="editingProduct" class="edit-stock-summary">
          <div>
            <small>实物库存</small>
            <strong>{{ editingProduct.stock }}</strong>
          </div>
          <div>
            <small>预留库存</small>
            <strong>{{ editingProduct.reservedStock }}</strong>
          </div>
          <div>
            <small>可售库存</small>
            <strong>{{ editingProduct.availableStock }}</strong>
          </div>
          <el-button plain :icon="SetUp" @click="openAdjustmentFromEditor">调整库存</el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="productDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="operationLoading" @click="saveProduct">
          保存商品
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="restockDialogVisible" title="商品入库" width="430px">
      <div v-if="restockingProduct" class="restock-summary">
        <span>
          <el-icon><Box /></el-icon>
        </span>
        <div>
          <small>正在为</small>
          <strong>{{ restockingProduct.name }}</strong>
        </div>
        <p>
          当前库存
          <strong>{{ restockingProduct.stock }}</strong>
          份
        </p>
      </div>
      <el-form label-position="top">
        <el-form-item label="本次入库数量">
          <el-input-number v-model="restockQuantity" :min="1" :max="9999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="restockDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="operationLoading" @click="saveRestock">
          确认入库
        </el-button>
      </template>
    </el-dialog>

    <StockAdjustmentDialog v-model="adjustmentDialogVisible" :product="adjustingProduct" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "BusinessInventory" });

import {
  Box,
  CircleCheck,
  Coffee,
  Delete,
  Edit,
  Goods,
  Plus,
  Search,
  SetUp,
  Warning,
} from "@element-plus/icons-vue";
import { useBusinessStore } from "@/stores/business";
import ReservationManager from "./components/ReservationManager.vue";
import StockAdjustmentDialog from "./components/StockAdjustmentDialog.vue";
import StockMovementTable from "./components/StockMovementTable.vue";
import type { Product, ProductInput } from "./types";

const store = useBusinessStore();
const activeTab = ref("products");
const keyword = ref("");
const categoryFilter = ref("全部");
const newCategory = ref("");
const productDialogVisible = ref(false);
const editingProductId = ref("");
const restockDialogVisible = ref(false);
const restockingProductId = ref("");
const restockQuantity = ref(10);
const operationLoading = ref(false);
const adjustmentDialogVisible = ref(false);
const adjustingProductId = ref("");

const createEmptyProduct = (): ProductInput => ({
  name: "",
  category: store.categories[0] ?? "",
  price: 12,
  stock: 0,
  warningStock: 5,
  status: 1,
});
const productForm = reactive<ProductInput>(createEmptyProduct());

const lowStockCount = computed(
  () => store.products.filter((item) => item.availableStock <= item.warningStock).length
);
const totalStock = computed(() => store.products.reduce((sum, item) => sum + item.stock, 0));
const filteredProducts = computed(() => {
  const search = keyword.value.trim().toLowerCase();
  return store.products.filter(
    (item) =>
      (categoryFilter.value === "全部" || item.category === categoryFilter.value) &&
      (!search || item.name.toLowerCase().includes(search))
  );
});
const restockingProduct = computed(() =>
  store.products.find((item) => item.id === restockingProductId.value)
);
const editingProduct = computed(() =>
  store.products.find((item) => item.id === editingProductId.value)
);
const adjustingProduct = computed(() =>
  store.products.find((item) => item.id === adjustingProductId.value)
);

function formatMoney(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function shortId(id: string): string {
  return id.replace("product-", "").slice(0, 12).toUpperCase();
}

function getRowClassName({ row }: { row: Product }): string {
  return row.availableStock <= row.warningStock ? "low-stock-row" : "";
}

function productCountByCategory(category: string): number {
  return store.products.filter((item) => item.category === category).length;
}

function openProductDialog(product?: Product): void {
  editingProductId.value = product?.id ?? "";
  Object.assign(
    productForm,
    product
      ? {
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          warningStock: product.warningStock,
          status: product.status,
        }
      : createEmptyProduct()
  );
  productDialogVisible.value = true;
}

async function saveProduct(): Promise<void> {
  if (!productForm.name.trim() || !productForm.category) {
    ElMessage.warning("请填写商品名称和分类");
    return;
  }
  operationLoading.value = true;
  try {
    if (editingProductId.value) {
      await store.updateProduct(editingProductId.value, productForm);
    } else {
      await store.addProduct(productForm);
    }
    productDialogVisible.value = false;
    ElMessage.success(editingProductId.value ? "商品已更新" : "商品已新增");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "保存失败");
  } finally {
    operationLoading.value = false;
  }
}

function openRestockDialog(product: Product): void {
  restockingProductId.value = product.id;
  restockQuantity.value = 10;
  restockDialogVisible.value = true;
}

function openAdjustmentDialog(product: Product): void {
  adjustingProductId.value = product.id;
  adjustmentDialogVisible.value = true;
}

function openAdjustmentFromEditor(): void {
  if (!editingProduct.value) return;
  productDialogVisible.value = false;
  openAdjustmentDialog(editingProduct.value);
}

async function saveRestock(): Promise<void> {
  operationLoading.value = true;
  try {
    await store.restockProduct(restockingProductId.value, restockQuantity.value);
    restockDialogVisible.value = false;
    ElMessage.success("入库成功");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "入库失败");
  } finally {
    operationLoading.value = false;
  }
}

async function toggleProduct(product: Product): Promise<void> {
  const wasOnline = product.status === 1;
  if (product.status === 1) {
    try {
      await ElMessageBox.confirm(`下架后，“${product.name}”将不会出现在收银台。`, "确认下架", {
        type: "warning",
      });
    } catch {
      return;
    }
  }
  try {
    await store.toggleProduct(product.id);
    ElMessage.success(wasOnline ? "商品已下架" : "商品已上架");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "状态更新失败");
  }
}

async function addCategory(): Promise<void> {
  try {
    await store.addCategory(newCategory.value);
    newCategory.value = "";
    ElMessage.success("分类已添加");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "添加失败");
  }
}

async function renameCategory(category: string): Promise<void> {
  try {
    const { value } = await ElMessageBox.prompt("请输入新的分类名称", `重命名“${category}”`, {
      inputValue: category,
      inputPattern: /\S+/,
      inputErrorMessage: "分类名称不能为空",
    });
    await store.renameCategory(category, value);
    if (categoryFilter.value === category) categoryFilter.value = value;
    ElMessage.success("分类已重命名");
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message);
  }
}

async function deleteCategory(category: string): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除分类“${category}”？`, "删除分类", { type: "warning" });
    await store.removeCategory(category);
    if (categoryFilter.value === category) categoryFilter.value = "全部";
    ElMessage.success("分类已删除");
  } catch (error) {
    if (error instanceof Error) ElMessage.error(error.message);
  }
}

onMounted(() => {
  store.initialize().catch(() => undefined);
});
</script>

<style lang="scss" scoped>
.inventory-page {
  min-height: calc(100vh - 104px);
  padding: 24px;
  color: #2f2925;
  background: #f5f4f0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  p {
    margin: 0 0 4px;
    font-size: 12px;
    font-weight: 800;
    color: #52745f;
    letter-spacing: 0.15em;
  }

  h1 {
    margin: 0 0 5px;
    font-size: 32px;
  }

  span {
    color: #80766f;
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 16px;

  article {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 18px;
    background: #fff;
    border: 1px solid #ebe7e1;
    border-radius: 16px;
  }

  article > div {
    display: flex;
    flex-direction: column;

    small {
      color: #8c837d;
    }

    strong {
      margin-top: 2px;
      font-size: 27px;
    }
  }
}

.metric-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  font-size: 22px;
  border-radius: 14px;

  &.is-green {
    color: #4e7c5d;
    background: #e9f2e9;
  }

  &.is-blue {
    color: #4d7291;
    background: #e9f1f6;
  }

  &.is-orange {
    color: #c57836;
    background: #fff0df;
  }

  &.is-brown {
    color: #795e50;
    background: #f2ebe6;
  }
}

.content-card {
  padding: 4px 20px 20px;
  background: #fff;
  border: 1px solid #ebe7e1;
  border-radius: 18px;
  box-shadow: 0 14px 35px rgb(61 47 38 / 5%);
}

.table-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 0 18px;

  > span {
    margin-left: auto;
    font-size: 12px;
    color: #9b928b;
  }
}

.search-input {
  width: 260px;
}

.category-filter {
  width: 150px;
}

.product-cell,
.stock-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.product-cell > span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  font-size: 20px;
  color: #52745f;
  background: #edf2ec;
  border-radius: 12px;
}

.product-cell > div {
  display: flex;
  flex-direction: column;

  small {
    margin-top: 3px;
    font-size: 10px;
    color: #aaa19a;
  }
}

.stock-cell {
  strong {
    font-size: 22px;
    color: #3b332e;
  }

  > span {
    color: #90867f;
  }

  &.is-reserved strong {
    color: #c27b3e;
  }
}

:deep(.low-stock-row) {
  --el-table-tr-bg-color: #fff7f4;
}

.category-manager {
  display: grid;
  grid-template-columns: minmax(280px, 0.75fr) minmax(400px, 1.25fr);
  gap: 40px;
  padding: 24px 8px;
}

.category-manager__intro {
  padding: 28px;
  background: #eef2eb;
  border-radius: 18px;

  h2 {
    margin: 0 0 8px;
    font-size: 24px;
  }

  p {
    margin: 0 0 24px;
    line-height: 1.7;
    color: #746b64;
  }
}

.category-manager__add {
  display: flex;
  gap: 8px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  article {
    display: grid;
    grid-template-columns: 42px 1fr auto auto;
    gap: 8px;
    align-items: center;
    padding: 14px;
    border: 1px solid #ece7e1;
    border-radius: 13px;
  }

  article > div {
    display: flex;
    flex-direction: column;

    small {
      margin-top: 3px;
      color: #9b928b;
    }
  }
}

.category-list__index {
  font-size: 13px;
  font-weight: 800;
  color: #7d9684;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 15px;

  .is-wide {
    grid-column: 1 / -1;
  }

  :deep(.el-select),
  :deep(.el-input-number) {
    width: 100%;
  }
}

.edit-stock-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 14px;
  background: #f5f3ef;
  border-radius: 12px;

  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  small {
    color: #8d847d;
  }
  strong {
    font-size: 20px;
  }
}

.restock-summary {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  margin-bottom: 18px;
  background: #f2f5ef;
  border-radius: 14px;

  > span {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    font-size: 22px;
    color: #52745f;
    background: #fff;
    border-radius: 12px;
  }

  > div {
    display: flex;
    flex-direction: column;

    small {
      color: #8d847d;
    }
  }

  p {
    margin: 0;
    color: #7c726b;
  }
}

@media (width <= 1000px) {
  .metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .category-manager {
    grid-template-columns: 1fr;
  }
}
</style>
