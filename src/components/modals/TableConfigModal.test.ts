import { describe, it, expect, vi } from "vitest";
import { reactive } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import TableConfigModal from "./TableConfigModal.vue";
import type { TableElement } from "@/types";

vi.mock("./BaseModal.vue", () => ({ default: { template: "<div><slot /><slot name='footer' /></div>" } }));
vi.mock("naive-ui", () => ({ NButton: { template: "<button><slot /></button>" } }));

// Tables live in the reactive report model
const reactiveTable = (): TableElement =>
  reactive({
    type: "table",
    uuid: "t1",
    x: 0,
    y: 0,
    width: 555,
    height: 100,
    binding: {
      tableName: "Table 1",
      datasetName: "table_aaa111",
      sourceId: "procurement",
      sourceName: "Procurement",
      columns: [{ key: "po_number", label: "PO", type: "text", width: 555 }],
      filters: [],
      filterMatch: "all",
      sort: [],
      showTotals: false,
      theme: "emerald",
    },
  }) as TableElement;

async function open(props: Record<string, unknown>) {
  const wrapper = mount(TableConfigModal, {
    props: { visible: false, table: null, tableWidth: 555, existingTableNames: [], existingDatasetNames: [], reportStyles: [] },
  });
  await wrapper.setProps({ visible: true, ...props });
  // mock data source delay
  await new Promise((resolve) => setTimeout(resolve, 200));
  await flushPromises();
  return wrapper;
}

describe("TableConfigModal", () => {
  it("opens an existing table with its data, even though the table is reactive", async () => {
    const wrapper = await open({ table: reactiveTable() });
    const vm = wrapper.vm as any;
    expect(vm.schema?.id).toBe("procurement");
    expect(vm.columns.map((c: any) => c.label)).toEqual(["PO"]);
    expect(vm.theme).toBe("emerald");
    expect(wrapper.find(".tcm-note").exists()).toBe(false);
  });

  it("a different source dropped on a filled table replaces its data on Apply", async () => {
    const wrapper = await open({ table: reactiveTable(), initialSourceId: "products" });
    const vm = wrapper.vm as any;
    expect(vm.schema?.id).toBe("products");
    expect(vm.columns.some((c: any) => c.key === "po_number")).toBe(false);
    // the table keeps its name and look
    expect(vm.draftBinding.tableName).toBe("Table 1");
    expect(vm.draftBinding.theme).toBe("emerald");
    expect(wrapper.find(".tcm-note").text()).toContain("dataTable.config.replacesData");
  });
});
