<template>
  <div class="element-properties">
    <!-- Panel header: title, with the report's style manager beside it -->
    <div class="panel-header">
      <!-- What the panel is showing: the selected element, or the report -->
      <h3>{{ panelTitle }}</h3>
      <button type="button" class="chip-btn" @click="showStyleManagerModal = true">
        <Palette :size="13" aria-hidden="true" />
        {{ t("properties.styleManagement") }}
      </button>
    </div>

    <!-- Report properties -->
    <div v-if="!selectedElement || !currentElement" class="property-section">

      <!-- Band height and template limits settings -->
      <div class="form-group">
        <div class="band-settings-header-wrapper">
          <div class="band-settings-title-group">
            <h4>{{ t("properties.templateBandSettings") }}</h4>
            <span class="template-scope-pill">{{
              t("properties.templateScopeBadge")
            }}</span>
          </div>
          <button
            type="button"
            class="reset-template-limits-btn"
            :title="t('properties.resetToDefaultTooltip')"
            @click="resetTemplateBandLimitsToDefault"
          >
            <RotateCcw :size="11" :stroke-width="2.2" />
            {{ t("properties.resetDefaults") }}
          </button>
        </div>
        <div class="band-cards-grid">
          <!-- Background is an underlay sized to the page, not a stacked band -->
          <div
            v-for="(band, index) in bands"
            v-show="band.type !== 'background'"
            :key="band.type"
            class="template-band-card"
          >
            <!-- Card Header: Band Name + Auto badge for Detail -->
            <div class="template-band-header">
              <span class="template-band-title">{{
                getBandDisplayName(band.type)
              }}</span>
              <span
                v-if="band.type === 'detail'"
                class="band-badge-auto"
              >
                {{ t("properties.detailAutoCalculated") }}
              </span>
            </div>

            <!-- Card Inputs: Height, Min Height, Max Height -->
            <div class="band-limit-inputs">
              <div class="band-limit-input-group">
                <label>{{ t("properties.height") }}</label>
                <div
                  class="input-unit-wrapper"
                  :class="{ 'is-disabled': band.type === 'detail' }"
                >
                  <input
                    :value="band.height"
                    type="number"
                    :min="
                      band.type !== 'detail' ? getBandLimit(band.type).min : 0
                    "
                    :max="
                      band.type !== 'detail'
                        ? getMaxPhysicalHeight(band.type)
                        : undefined
                    "
                    step="1"
                    :disabled="band.type === 'detail'"
                    :title="
                      band.type === 'detail'
                        ? t('properties.detailAutoCalculatedHint')
                        : ''
                    "
                    @change="
                      setIntegerValue(band, 'height', $event) &&
                        updateBandHeight(index)
                    "
                  />
                  <span class="unit">px</span>
                </div>
              </div>

              <template v-if="band.type !== 'detail'">
                <div class="band-limit-input-group">
                  <label>{{ t("properties.minHeight") }}</label>
                  <div class="input-unit-wrapper">
                    <input
                      :value="getBandLimit(band.type).min"
                      type="number"
                      min="10"
                      step="1"
                      @change="
                        setIntegerValue(getBandLimit(band.type), 'min', $event) &&
                          onTemplateMinChange(band.type)
                      "
                    />
                    <span class="unit">px</span>
                  </div>
                </div>
                <div class="band-limit-input-group">
                  <label>{{ t("properties.maxHeight") }}</label>
                  <div class="input-unit-wrapper">
                    <input
                      :value="getBandLimit(band.type).max"
                      type="number"
                      :min="getBandLimit(band.type).min || 10"
                      :max="getMaxAllowedLimit(band.type)"
                      step="1"
                      @change="
                        setIntegerValue(getBandLimit(band.type), 'max', $event) &&
                          onTemplateMaxChange(band.type)
                      "
                    />
                    <span class="unit">px</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Element properties -->
    <div v-else-if="selectedElement && currentElement" class="property-section">
      <!-- Element properties tabs -->
      <!-- Tabs: the highlight slides to the open tab (positioned by index) -->
      <div
        class="prop-tab-bar"
        role="tablist"
        :style="{ '--tab-count': availableTabs.length, '--tab-index': availableTabs.indexOf(activeTab) }"
      >
        <span class="prop-tab-indicator" aria-hidden="true"></span>
        <button
          v-for="tab in availableTabs"
          :key="tab"
          type="button"
          role="tab"
          class="prop-tab"
          :class="{ active: activeTab === tab }"
          :aria-selected="activeTab === tab"
          @click="activeTab = tab"
        >
          {{ t(TAB_LABELS[tab] ?? tab) }}
        </button>
      </div>

      <Transition name="prop-tab-fade" mode="out-in">
        <!-- Basic properties tab -->
        <div v-if="activeTab === 'basic'" key="basic" class="prop-tab-pane" role="tabpanel">
          <div class="box-section compact">
            <h5>{{ t("properties.positionSize") }}</h5>
            <div class="geometry-grid">
              <label v-for="dim in GEOMETRY_FIELDS" :key="dim" class="field">
                <span class="field-label">{{ t(`properties.${dim}`) }}</span>
                <span class="unit-input">
                  <input
                    :value="currentElement[dim]"
                    type="number"
                    @change="setIntegerValue(currentElement, dim, $event)"
                  />
                  <span>px</span>
                </span>
              </label>
            </div>
            <label v-if="reportStyles && reportStyles.length > 0" class="field style-ref-field">
              <span class="field-label">{{ t("properties.styleReference") }}</span>
              <select
                class="card-select"
                :value="currentElement.style ?? ''"
                @change="setTextProperty('style', ($event.target as HTMLSelectElement).value || undefined)"
              >
                <option value="">{{ t("properties.noStyle") }}</option>
                <option v-for="st in reportStyles" :key="st.name" :value="st.name">{{ st.name }}</option>
              </select>
            </label>
          </div>

          <!-- Frame properties: border presets, border lines, layout -->
          <FrameProperties
            v-if="currentElement && currentElement.type === 'frame'"
            :element="currentElement"
            :is-page-border="isPageBorder"
            @update:element="replaceCurrentElement"
          />

          <!-- Image properties -->
          <template v-if="currentElement && currentElement.type === 'image'">
            <div class="box-section compact">
              <h5>{{ t("properties.imageName") }}</h5>
              <div class="image-name-row">
                <input
                  type="text"
                  class="card-input is-readonly"
                  :value="getImageDisplayName(currentElement)"
                  readonly
                  :title="getImageDisplayName(currentElement)"
                  :aria-label="t('properties.imageName')"
                />
                <button
                  type="button"
                  class="chip-btn chip-btn-solid"
                  :disabled="isPropertiesImageUploading"
                  @click="triggerPropertiesImageUpload"
                >
                  <Upload :size="13" aria-hidden="true" />
                  {{ isPropertiesImageUploading ? t("properties.uploadingImage") : t("properties.uploadImageButton") }}
                </button>
              </div>
              <small class="card-hint">{{ t("properties.imageNameHint") }}</small>
              <input
                ref="propImageFileInputRef"
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                style="display: none"
                @change="handlePropertiesImageUpload"
              />
            </div>
            <div class="box-section compact">
              <h5>{{ t("properties.rotation") }}</h5>
              <div class="seg" role="radiogroup" :aria-label="t('properties.rotation')">
                <button
                  v-for="rot in ROTATIONS"
                  :key="rot.value"
                  type="button"
                  role="radio"
                  class="seg-btn"
                  :class="{ active: (currentElement.rotation || 'None') === rot.value }"
                  :aria-checked="(currentElement.rotation || 'None') === rot.value"
                  :title="t(rot.titleKey)"
                  @click="setElementRotation(rot.value)"
                >
                  <FileText :size="16" aria-hidden="true" :style="{ transform: `rotate(${rot.deg}deg)` }" />
                  <span>{{ rot.deg }}°</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Chart: type, title and the data it plots -->
          <template v-if="currentElement.type === 'chart'">
            <div class="box-section compact">
              <h5>{{ t("chart.title") }}</h5>
              <label class="field">
                <span class="field-label">{{ t("chart.type") }}</span>
                <select
                  class="card-select"
                  :value="currentElement.chartType"
                  @change="setTextProperty('chartType', ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="type in chartTypeOptions" :key="type" :value="type">{{ t(`chart.types.${type}`) }}</option>
                </select>
              </label>
              <label class="field card-gap-sm">
                <span class="field-label">{{ t("chart.chartTitle") }}</span>
                <input
                  class="card-input"
                  type="text"
                  :value="chartTitleText"
                  :placeholder="t('chart.chartTitlePlaceholder')"
                  @change="setChartTitle(($event.target as HTMLInputElement).value)"
                />
              </label>
              <label class="toggle-row card-gap-sm">
                <input
                  type="checkbox"
                  :checked="currentElement.isShowLegend !== false"
                  @change="setTextProperty('isShowLegend', ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ t("chart.showLegend") }}</span>
              </label>
            </div>

            <div class="box-section compact">
              <h5>{{ t("chart.data") }}</h5>
              <label class="field">
                <span class="field-label">{{ t("chart.dataFrom") }}</span>
                <select
                  class="card-select"
                  :value="currentElement.subDataset ?? ''"
                  @change="setTextProperty('subDataset', ($event.target as HTMLSelectElement).value || undefined)"
                >
                  <option value="">{{ t("chart.reportData") }}</option>
                  <option v-for="ds in subDatasets || []" :key="ds.name" :value="ds.name">{{ ds.name }}</option>
                </select>
              </label>
              <label v-for="field in chartDataFields" :key="field.key" class="field card-gap-sm">
                <span class="field-label">{{ t(field.labelKey) }}</span>
                <input
                  class="card-input mono"
                  type="text"
                  list="chart-field-options"
                  :value="(currentElement as any)[field.key] ?? ''"
                  :placeholder="'$F{' + t('chart.fieldPlaceholder') + '}'"
                  @change="setTextProperty(field.key, ($event.target as HTMLInputElement).value.trim() || undefined)"
                />
              </label>
              <datalist id="chart-field-options">
                <option v-for="f in reportFields || []" :key="f.name" :value="`$F{${f.name}}`" />
              </datalist>
              <small class="card-hint">{{ t(chartDataHintKey) }}</small>
            </div>
          </template>

          <!-- Barcode: symbology and value -->
          <template v-if="currentElement.type === 'barcode'">
            <div class="box-section compact">
              <h5>{{ t("properties.barcodeProperties") }}</h5>
              <label class="field">
                <span class="field-label">{{ t("properties.barcodeType") }}</span>
                <select
                  class="card-select"
                  :value="currentElement.barcodeType"
                  @change="setTextProperty('barcodeType', ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="code in BARCODE_TYPES" :key="code.value" :value="code.value">{{ code.label }}</option>
                </select>
              </label>
              <label class="field card-gap-sm">
                <span class="field-label">{{ t("properties.barcodeValue") }}</span>
                <input
                  class="card-input"
                  type="text"
                  :value="getBarcodeValue(currentElement)"
                  @input="updateBarcodeValue(($event.target as HTMLInputElement).value)"
                  :placeholder="t('properties.barcodeValuePlaceholder')"
                />
              </label>
            </div>
          </template>

          <template v-if="currentElement.type === 'barcode'">
            <div class="box-section compact">
              <h5>{{ t("properties.rotation") }}</h5>
              <div class="seg" role="radiogroup" :aria-label="t('properties.rotation')">
                <button
                  v-for="rot in ROTATIONS"
                  :key="rot.value"
                  type="button"
                  role="radio"
                  class="seg-btn"
                  :class="{ active: (currentElement.rotation || 'None') === rot.value }"
                  :aria-checked="(currentElement.rotation || 'None') === rot.value"
                  :title="t(rot.titleKey)"
                  @click="setElementRotation(rot.value)"
                >
                  <FileText :size="16" aria-hidden="true" :style="{ transform: `rotate(${rot.deg}deg)` }" />
                  <span>{{ rot.deg }}°</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Line: which way it runs (its look is in Style Settings) -->
          <template v-if="currentElement && currentElement.type === 'line'">
            <div class="box-section compact">
              <h5>{{ t("properties.lineOrientation") }}</h5>
              <div class="seg" role="radiogroup" :aria-label="t('properties.lineOrientation')">
                <button
                  v-for="dir in LINE_ORIENTATIONS"
                  :key="dir.value"
                  type="button"
                  role="radio"
                  class="seg-btn seg-btn-stacked"
                  :class="{ active: currentLineOrientation === dir.value }"
                  :aria-checked="currentLineOrientation === dir.value"
                  :title="t(dir.titleKey)"
                  @click="setLineOrientation(dir.value)"
                >
                  <component :is="dir.icon" :size="18" aria-hidden="true" :style="dir.iconStyle" />
                  <span>{{ t(dir.labelKey) }}</span>
                </button>
              </div>
              <button
                type="button"
                class="ghost-btn"
                :title="t('properties.crossLineTitle')"
                @click="addCrossingLine"
              >
                <X :size="14" aria-hidden="true" />
                {{ t("properties.crossLine") }}
              </button>
            </div>
          </template>

          <!-- Text properties -->
          <template
            v-else-if="currentElement && currentElement.type === 'textField'"
          >
            <!-- Page number: format and page range instead of free text -->
            <PaginationProperties
              v-if="isPagination(currentElement)"
              :element="currentElement"
              @save-state="emit('save-state')"
              @update-jrxml="emit('update-jrxml')"
            />
            <div v-else class="box-section compact">
              <div class="card-head">
                <h5>{{ t("properties.textContent") }}</h5>
                <button
                  type="button"
                  class="chip-btn"
                  :title="t('properties.fitToTextTitle')"
                  @click="emit('fit-to-text')"
                >
                  <Scan :size="13" aria-hidden="true" />
                  {{ t("properties.fitToText") }}
                </button>
              </div>
              <textarea
                class="card-textarea"
                :value="getTextFieldDisplay(currentElement)"
                @input="updateTextFieldDisplay(($event.target as HTMLTextAreaElement).value)"
                :placeholder="t('properties.textFieldPlaceholder', { example: '$F{field_name}' })"
                rows="3"
              ></textarea>
              <label v-if="reportFields && reportFields.length > 0" class="field insert-field">
                <span class="field-label">{{ t("properties.insertFieldLabel") }}</span>
                <select
                  class="card-select"
                  @change="insertFieldIntoTextField(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
                >
                  <option value="">{{ t("properties.insertField") }}</option>
                  <option v-for="f in reportFields" :key="f.name" :value="`$F{${f.name}}`">{{ f.name }}</option>
                </select>
              </label>
            </div>
            <div class="box-section compact">
              <h5>{{ t("properties.rotation") }}</h5>
              <div class="seg" role="radiogroup" :aria-label="t('properties.rotation')">
                <button
                  v-for="rot in ROTATIONS"
                  :key="rot.value"
                  type="button"
                  role="radio"
                  class="seg-btn"
                  :class="{ active: (currentElement.rotation || 'None') === rot.value }"
                  :aria-checked="(currentElement.rotation || 'None') === rot.value"
                  :title="t(rot.titleKey)"
                  @click="setElementRotation(rot.value)"
                >
                  <FileText :size="16" aria-hidden="true" :style="{ transform: `rotate(${rot.deg}deg)` }" />
                  <span>{{ rot.deg }}°</span>
                </button>
              </div>
            </div>
          </template>
        </div>


        <!-- Table properties tab -->
        <div
          v-else-if="activeTab === 'table' && currentElement.type === 'table'"
          key="table"
          class="prop-tab-pane"
          role="tabpanel"
        >
          <!-- Table basic properties -->
          <TableProperties
            :element="currentElement"
            :available-styles="reportStyles.map((s) => s.name)"
            :report-fields="reportFields"
            :report-parameters="reportParameters"
            :report-variables="reportVariables"
            @update:element="handleTablePropertyUpdate"
          />

          <!-- Column management -->
          <div class="box-section compact">
            <h5>{{ t("properties.columnManagement") }}</h5>
            <div class="column-tree-toolbar">
              <button type="button" class="chip-btn chip-btn-solid" :title="t('properties.addColumn')" @click="handleAddRootColumn">
                <Plus :size="13" aria-hidden="true" />
                {{ t("properties.column") }}
              </button>
              <button type="button" class="chip-btn" :title="t('properties.addGroup')" @click="handleAddRootGroup">
                <Plus :size="13" aria-hidden="true" />
                {{ t("properties.group") }}
              </button>
              <button type="button" class="chip-btn chip-btn-muted" :title="t('properties.combineColumnsTitle')" @click="addColumnGroup">
                {{ t("properties.combineColumns") }}
              </button>
            </div>
            <div class="column-tree">
              <ColumnTreeNode
                v-for="(child, index) in tableChildren"
                :key="child.uuid || index"
                :node="child"
                :depth="0"
                :is-last="index === tableChildren.length - 1"
                :parent-uuid="null"
                :parent-length="tableChildren.length"
                :sibling-index="index"
                @update-node="handleColumnNodeUpdate"
                @delete-node="handleColumnNodeDelete"
                @add-column-after="handleAddColumnAfter"
                @add-column-child="handleAddColumnChild"
                @add-column-group-after="handleAddColumnGroupAfter"
                @ungroup-node="handleUngroupNode"
                @move-node="handleMoveNode"
              />
              <div v-if="tableChildren.length === 0" class="column-tree-empty-hint">
                {{ t("properties.noColumnsHint") }}
              </div>
            </div>
          </div>

          <!-- Row heights -->
          <div class="box-section compact">
            <h5>{{ t("properties.rowHeightSettings") }}</h5>
            <div class="geometry-grid">
              <label v-for="row in TABLE_ROW_HEIGHTS" :key="row.key" class="field">
                <span class="field-label">{{ t(row.labelKey) }}</span>
                <span class="unit-input">
                  <input
                    :value="tableRowHeights[row.key]"
                    type="number"
                    min="1"
                    @change="setTableRowHeight(row.key, $event)"
                  />
                  <span>px</span>
                </span>
              </label>
            </div>
          </div>
        </div>
 
        <!-- Style settings tab -->
        <div v-else key="style" class="prop-tab-pane" role="tabpanel">

            <!-- Border settings (not supported for table and line elements) -->
            <template v-if="currentElement.type !== 'table' && currentElement.type !== 'line'">
              <!-- Border settings for rectangle/ellipse elements (unified) -->
              <template
                v-if="
                  currentElement &&
                  (currentElement.type === 'rectangle' ||
                    currentElement.type === 'ellipse')
                "
              >
                <!-- Outline: line style, then width / colour / corners in one row -->
                <div class="box-section compact">
                  <h5>{{ t("properties.outline") }}</h5>
                  <span class="field-label">{{ t("properties.lineStyle") }}</span>
                  <div class="style-tiles style-tiles-4" role="radiogroup" :aria-label="t('properties.lineStyle')">
                    <button
                      v-for="line in SHAPE_STYLES"
                      :key="line.value"
                      type="button"
                      role="radio"
                      class="style-tile"
                      :class="{ active: rectangleBorderStyle === line.value }"
                      :aria-checked="rectangleBorderStyle === line.value"
                      @click="setRectangleBorderStyle(line.value)"
                    >
                      <span class="pen-swatch" :class="penSwatchClass(line.value)" aria-hidden="true" />
                      <span>{{ t(line.labelKey) }}</span>
                    </button>
                  </div>
                  <div class="value-row" :class="{ 'has-three': currentElement.type === 'rectangle' }">
                    <label class="field">
                      <span class="field-label">{{ t("properties.width") }}</span>
                      <span class="unit-input">
                        <input
                          :value="getRectangleBorderWidth()"
                          @change="setRectangleBorderWidth(($event.target as HTMLInputElement).value)"
                          type="number"
                          min="0"
                          max="10"
                          step="0.25"
                        />
                        <span>pt</span>
                      </span>
                    </label>
                    <div class="field">
                      <span class="field-label">{{ t("properties.color") }}</span>
                      <ColorSwatchPicker
                        :model-value="getRectangleBorderColor()"
                        @update:model-value="setRectangleBorderColor($event)"
                        class="swatch-fill"
                      />
                    </div>
                    <label v-if="currentElement.type === 'rectangle'" class="field">
                      <span class="field-label">{{ t("properties.cornerRadius") }}</span>
                      <span class="unit-input">
                        <input
                          :value="currentElement.radius ?? 0"
                          @change="setTextProperty('radius', Math.max(0, Math.round(parseFloat(($event.target as HTMLInputElement).value) || 0)))"
                          type="number"
                          min="0"
                        />
                        <span>px</span>
                      </span>
                    </label>
                  </div>
                </div>
              </template>


              <!-- Border settings for other elements (each side configurable independently) -->
              <template v-else>
                <!-- Borders: every side on its own row (All sets the four at once) -->
                <div class="box-section compact border-designer">
                  <h5>{{ t("properties.sideBorders") }}</h5>
                  <div class="border-table" role="table" :aria-label="t('properties.sideBorders')">
                    <div class="border-table-head" role="row">
                      <span role="columnheader">{{ t("properties.side") }}</span>
                      <!-- One name per icon column, so every line style is labelled -->
                      <span role="columnheader" class="line-style-names" :aria-label="t('properties.lineStyle')">
                        <span v-for="line in LINE_STYLES" :key="line.value">{{ t(line.labelKey) }}</span>
                      </span>
                      <span role="columnheader">{{ t("properties.width") }}</span>
                      <span role="columnheader">{{ t("properties.color") }}</span>
                    </div>
                    <div
                      v-for="row in BORDER_ROWS"
                      :key="row"
                      class="border-row"
                      :class="{ 'is-all': row === 'all' }"
                      role="row"
                    >
                      <span class="border-row-label" role="rowheader">{{ borderRowLabel(row) }}</span>
                      <div class="line-style-picker" role="radiogroup" :aria-label="`${borderRowLabel(row)} ${t('properties.lineStyle')}`">
                        <button
                          v-for="line in LINE_STYLES"
                          :key="line.value"
                          type="button"
                          role="radio"
                          class="line-style-btn"
                          :class="{ active: getRowBorderStyle(row) === line.value }"
                          :aria-checked="getRowBorderStyle(row) === line.value"
                          :title="t(line.labelKey)"
                          :aria-label="t(line.labelKey)"
                          @click="setRowBorderStyle(row, line.value)"
                        >
                          <Ban v-if="line.value === ''" :size="18" aria-hidden="true" />
                          <span v-else class="pen-swatch is-short" :class="penSwatchClass(line.value)" aria-hidden="true" />
                        </button>
                      </div>
                      <label class="unit-input">
                        <input
                          :value="getRowBorderWidth(row)"
                          @input="setRowBorderWidth(row, ($event.target as HTMLInputElement).value)"
                          type="number"
                          min="0"
                          max="10"
                          step="0.25"
                          :aria-label="`${borderRowLabel(row)} ${t('properties.width')}`"
                        />
                        <span>pt</span>
                      </label>
                      <ColorSwatchPicker
                        :model-value="getRowBorderColor(row)"
                        @update:model-value="setRowBorderColor(row, $event)"
                        class="color-control compact"
                        :aria-label="`${borderRowLabel(row)} ${t('properties.color')}`"
                      />
                    </div>
                  </div>

                  <!-- Images, boxes and text: corner radius for all corners at once, or each corner -->
                  <div v-if="cornerRadii" class="corner-designer">
                    <div class="pad-head">
                      <span class="pad-title">{{ t("properties.cornerRadius") }}</span>
                      <label class="pad-all">
                        <span class="field-label">{{ t("properties.cornerAll") }}</span>
                        <span class="unit-input">
                          <input
                            :value="sharedCornerRadius"
                            @change="setCornerRadius(null, ($event.target as HTMLInputElement).value)"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                          />
                          <span>px</span>
                        </span>
                      </label>
                    </div>
                    <div class="corner-pad">
                      <label
                        v-for="corner in CORNER_GRID"
                        :key="corner"
                        class="pad-input"
                        :class="'corner-input-' + corner"
                      >
                        <span class="field-label">{{ t(`properties.corner.${corner}`) }}</span>
                        <span class="unit-input">
                          <input
                            :value="cornerRadii?.[corner] ?? 0"
                            @change="setCornerRadius(corner, ($event.target as HTMLInputElement).value)"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                          />
                          <span>px</span>
                        </span>
                      </label>
                      <div class="corner-preview" :style="cornerPreviewStyle"></div>
                    </div>
                    <small
                      v-if="
                        currentElement.type === 'frame' &&
                        (currentElement.radius ?? 0) > 0 &&
                        !isUniformBorder(currentElement.box)
                      "
                      class="corner-radius-hint"
                    >{{ t("properties.cornerRadiusHint") }}</small>
                  </div>
                </div>

                <!-- Margins (space inside the element; a page border has no content to pad) -->
                <div v-if="!isPageBorder" class="box-section compact">
                  <div class="pad-head">
                    <h5 class="pad-title">{{ t("properties.marginSettings") }}</h5>
                    <label class="pad-all">
                      <span class="field-label">{{ t("properties.allSides") }}</span>
                      <span class="unit-input">
                        <input
                          :value="currentElement.box?.padding ?? ''"
                          @input="handleGlobalMarginInput"
                          type="number"
                          min="0"
                        />
                        <span>px</span>
                      </span>
                    </label>
                  </div>
                  <div class="margin-pad">
                    <label
                      v-for="side in MARGIN_SIDES"
                      :key="side"
                      class="pad-input"
                      :class="'margin-input-' + side"
                    >
                      <span class="field-label">{{ t(`properties.${side}Side`) }}</span>
                      <span class="unit-input">
                        <input
                          :value="getMarginValue(side)"
                          @input="handleSideMarginInput(side, $event)"
                          type="number"
                          min="0"
                        />
                        <span>px</span>
                      </span>
                    </label>
                    <div class="margin-preview">
                      <div class="margin-preview-content" :style="marginPreviewStyle"></div>
                    </div>
                  </div>
                </div>
              </template>
            </template>
            <!-- Line: style, then thickness and colour in one row -->
            <div v-if="currentElement.type === 'line'" class="box-section compact">
              <h5>{{ t("properties.lineSettings") }}</h5>
              <span class="field-label">{{ t("properties.lineStyle") }}</span>
              <div class="style-tiles style-tiles-4" role="radiogroup" :aria-label="t('properties.lineStyle')">
                <button
                  v-for="line in LINE_ONLY_STYLES"
                  :key="line.value"
                  type="button"
                  role="radio"
                  class="style-tile"
                  :class="{ active: (currentElement.lineStyle || 'Solid') === line.value }"
                  :aria-checked="(currentElement.lineStyle || 'Solid') === line.value"
                  @click="setTextProperty('lineStyle', line.value)"
                >
                  <span class="pen-swatch" :class="penSwatchClass(line.value)" aria-hidden="true" />
                  <span>{{ t(line.labelKey) }}</span>
                </button>
              </div>
              <div class="value-row">
                <label class="field">
                  <span class="field-label">{{ t("properties.lineThickness") }}</span>
                  <span class="unit-input">
                    <input
                      :value="currentElement.lineWidth ?? 1"
                      @change="setTextProperty('lineWidth', Math.max(0.25, parseFloat(($event.target as HTMLInputElement).value) || 1))"
                      type="number"
                      min="0.25"
                      step="0.25"
                    />
                    <span>pt</span>
                  </span>
                </label>
                <div class="field">
                  <span class="field-label">{{ t("properties.lineColor") }}</span>
                  <ColorSwatchPicker
                    :model-value="currentElement.lineColor || '#000000'"
                    @update:model-value="setColorProperty('lineColor', 'lineColor', $event)"
                    class="swatch-fill"
                  />
                </div>
              </div>
            </div>

            <!-- Text: font, size, style, alignment and colour together -->
            <div v-if="showFontName || showTextAlignmentAndStyle || showTextColor" class="box-section compact text-card">
              <h5>{{ t("properties.textSettings") }}</h5>
              <div v-if="showFontName" class="field-row">
                <label class="field grow">
                  <span class="field-label">{{ t("properties.fontName") }}</span>
                  <select
                    :value="currentElement.fontFamily ?? ''"
                    @change="setTextProperty('fontFamily', ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">{{ t("properties.useDefaultFont") }}</option>
                    <option v-for="font in availableFonts" :key="font" :value="font">{{ font }}</option>
                  </select>
                </label>
                <label class="field font-size-field">
                  <span class="field-label">{{ t("properties.fontSize") }}</span>
                  <span class="unit-input">
                    <input
                      :value="currentElement.fontSize ?? ''"
                      @change="setFontSize(($event.target as HTMLInputElement).value)"
                      type="number"
                      min="1"
                      max="200"
                    />
                    <span>pt</span>
                  </span>
                </label>
              </div>

              <div v-if="showTextAlignmentAndStyle" class="field-row">
                <div class="field">
                  <span class="field-label">{{ t("properties.fontStyle") }}</span>
                  <div class="icon-segment">
                    <button
                      v-for="fmt in FONT_TOGGLES"
                      :key="fmt.key"
                      type="button"
                      class="icon-btn"
                      :class="['icon-btn-' + fmt.key, { active: !!currentElement[fmt.key] }]"
                      :aria-pressed="!!currentElement[fmt.key]"
                      :title="t(fmt.labelKey)"
                      :aria-label="t(fmt.labelKey)"
                      @click="setTextProperty(fmt.key, !currentElement[fmt.key])"
                    >{{ fmt.glyph }}</button>
                  </div>
                </div>
                <div class="field">
                  <span class="field-label">{{ t("properties.textAlignment") }}</span>
                  <div class="icon-segment">
                    <button
                      v-for="align in H_ALIGNS"
                      :key="align.value"
                      type="button"
                      class="icon-btn"
                      :class="{ active: currentElement.textAlignment === align.value }"
                      :aria-pressed="currentElement.textAlignment === align.value"
                      :title="t(align.labelKey)"
                      :aria-label="t(align.labelKey)"
                      @click="setHorizontalAlignment(align.value)"
                    >
                      <component :is="align.icon" :size="16" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div class="field">
                  <span class="field-label">{{ t("properties.verticalAlignment") }}</span>
                  <div class="icon-segment">
                    <button
                      v-for="align in V_ALIGNS"
                      :key="align.value"
                      type="button"
                      class="icon-btn"
                      :class="{ active: currentElement.verticalAlignment === align.value }"
                      :aria-pressed="currentElement.verticalAlignment === align.value"
                      :title="t(align.labelKey)"
                      :aria-label="t(align.labelKey)"
                      @click="setVerticalAlignment(align.value)"
                    >
                      <component :is="align.icon" :size="16" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="showTextColor" class="field">
                <span class="field-label">{{ t("properties.forecolor") }}</span>
                <ColorPickerWithOpacity
                  :model-value="currentElement.forecolor || '#000000'"
                  :mode="currentElement.forecolorMode"
                  @update:model-value="setColorProperty('forecolor', 'forecolor', $event)"
                  @update:mode="setColorProperty('forecolor', 'forecolorMode', $event)"
                />
              </div>
            </div>

            <!-- Fill -->
            <div v-if="showBackgroundColor" class="box-section compact">
              <h5>{{ t("properties.backgroundColor") }}</h5>
              <ColorPickerWithOpacity
                :model-value="currentElement.backcolor"
                :mode="currentElement.mode"
                @update:model-value="setColorProperty('backcolor', 'backcolor', $event)"
                @update:mode="setColorProperty('backcolor', 'mode', $event)"
              />
            </div>

            <!-- Table-specific style settings -->
            <div v-if="currentElement.type === 'table'" class="box-section compact">
              <h5>{{ t("properties.tableStyleSettings") }}</h5>
              <div class="geometry-grid">
                <label v-for="part in TABLE_STYLE_PARTS" :key="part.key" class="field">
                  <span class="field-label">{{ t(part.labelKey) }}</span>
                  <select
                    class="card-select"
                    :value="tableStyles[part.key]"
                    @change="setTableStyle(part.key, ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="name in ['Table_TH', 'Table_CH', 'Table_TD']" :key="name" :value="name">{{ name }}</option>
                  </select>
                </label>
              </div>
            </div>

        </div>

      </Transition>

      <div class="element-actions">
        <button type="button" class="delete-element-btn" @click="deleteElement">
          <Trash2 :size="14" aria-hidden="true" />
          {{ t("properties.deleteElement") }}
        </button>
      </div>
    </div>
  </div>

  <!-- Style management modal -->
  <BaseModal
    :visible="showStyleManagerModal"
    :title="t('properties.styleManagement')"
    @update:visible="showStyleManagerModal = $event"
    @confirm="saveStyleChanges"
    @cancel="cancelStyleChanges"
  >
    <div class="style-manager-content">
      <div
        v-for="(style, index) in reportStyles"
        :key="index"
        class="style-item"
      >
        <h4>{{ style.name }}</h4>
        <div class="style-properties">
          <!-- Background mode settings -->
          <div class="form-group">
            <label>{{ t("properties.backgroundMode") }}</label>
            <select v-model="style.mode" @change="emit('update-jrxml')">
              <option :value="undefined">
                {{ t("properties.defaultTransparent") }}
              </option>
              <option value="Transparent">
                {{ t("properties.transparent") }}
              </option>
              <option value="Opaque">
                {{ t("properties.opaque") }}
              </option>
            </select>
          </div>

          <!-- Foreground color settings -->
          <div class="form-group">
            <label>{{ t("properties.forecolor") }}</label>
            <ColorPickerWithOpacity
              v-model="style.forecolor"
              v-model:mode="style.forecolorMode"
              @update:modelValue="emit('update-jrxml')"
              @update:mode="emit('update-jrxml')"
            />
          </div>

          <!-- Background color settings -->
          <div class="form-group">
            <label>{{ t("properties.backgroundColor") }}</label>
            <ColorPickerWithOpacity
              v-model="style.backcolor"
              v-model:mode="style.mode"
              @update:modelValue="emit('update-jrxml')"
              @update:mode="emit('update-jrxml')"
            />
          </div>

          <!-- Horizontal text alignment -->
          <div class="form-group">
            <label>{{ t("properties.hTextAlign") }}</label>
            <select v-model="style.hTextAlign" @change="emit('update-jrxml')">
              <option :value="undefined">
                {{ t("properties.default") }}
              </option>
              <option value="Left">
                {{ t("properties.left") }}
              </option>
              <option value="Center">
                {{ t("properties.center") }}
              </option>
              <option value="Right">
                {{ t("properties.right") }}
              </option>
              <option value="Justified">
                {{ t("properties.justified") }}
              </option>
            </select>
          </div>

          <!-- Horizontal image alignment -->
          <div class="form-group">
            <label>{{ t("properties.hImageAlign") }}</label>
            <select v-model="style.hImageAlign" @change="emit('update-jrxml')">
              <option :value="undefined">
                {{ t("properties.default") }}
              </option>
              <option value="Left">
                {{ t("properties.left") }}
              </option>
              <option value="Center">
                {{ t("properties.center") }}
              </option>
              <option value="Right">
                {{ t("properties.right") }}
              </option>
            </select>
          </div>

          <!-- Vertical text alignment -->
          <div class="form-group">
            <label>{{ t("properties.vTextAlign") }}</label>
            <select v-model="style.vTextAlign" @change="emit('update-jrxml')">
              <option :value="undefined">
                {{ t("properties.default") }}
              </option>
              <option value="Top">
                {{ t("properties.top") }}
              </option>
              <option value="Middle">
                {{ t("properties.middle") }}
              </option>
              <option value="Bottom">
                {{ t("properties.bottom") }}
              </option>
            </select>
          </div>

          <!-- Vertical image alignment -->
          <div class="form-group">
            <label>{{ t("properties.vImageAlign") }}</label>
            <select v-model="style.vImageAlign" @change="emit('update-jrxml')">
              <option :value="undefined">
                {{ t("properties.default") }}
              </option>
              <option value="Top">
                {{ t("properties.top") }}
              </option>
              <option value="Middle">
                {{ t("properties.middle") }}
              </option>
              <option value="Bottom">
                {{ t("properties.bottom") }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Ban,
  FileText,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Scan,
  Slash,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Trash2,
  Upload,
  X,
} from "@lucide/vue";
import ColorSwatchPicker from '../../common/ColorSwatchPicker.vue';
import { computed, ref, onMounted, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { NButton, NRadioGroup, NRadioButton } from "naive-ui";
import type { Band, SelectedElementInfo, TableDataset } from "../../../types";
import { getAvailableFonts } from "../../../utils/fontUtils";
import {
  CORNER_NAMES,
  getElementTypeName,
  getImageDisplayName,
  getPropertyCornerRadii,
  quoteExpressionValue,
  stripExpressionQuotes,
  setPropertyCornerRadii,
  type CornerName,
  type CornerRadii,
  setImageCrop,
  setImageName,
} from "../../../utils/elementUtils";
import {
  ImageUploadError,
  resolveImageSource,
  toImageExpression,
} from "../../../services/imageService";
import {
  getEffectiveDefaultBandLimits,
  getEffectiveDefaultBandConfig,
} from "../../../constants/constants";
import BaseModal from "../../modals/BaseModal.vue";
import ColorPickerWithOpacity from "./ColorPickerWithOpacity.vue";
import PaginationProperties from "./PaginationProperties.vue";
import { isPagination } from "../../../utils/paginationPresets";
import FrameProperties from "./FrameProperties.vue";
import {
  getBoxCornerRadii,
  setBoxCornerRadii,
  clampRectInBox,
  isBoxPart,
  isUniformBorder,
} from "../../../utils/framePresets";
import TableProperties from "./TableProperties.vue";
import ColumnTreeNode from "./ColumnTreeNode.vue";
import { useLivePreview } from "@/composables/useLivePreview";
import {
  syncTableColumns,
  createDefaultColumn,
  createDefaultColumnGroup,
  findInParentArray,
  ungroupColumnGroup,
} from "../../../utils/table/ColumnTreeSync";
import { TableUtils } from "../../../utils/table/ColumnFactory";
import type {
  Column,
  ColumnGroup,
  BaseColumn,
  TableElement,
} from "../../../types/table";
import SwitchControl from "./common/SwitchControl.vue";

const { t } = useI18n();

interface Props {
  selectedBandIndex: number | null;
  selectedElement: SelectedElementInfo | null;
  bands: Band[];
  reportProperties: any;
  subDatasets?: TableDataset[];
  reportStyles?: any[];
  reportFields?: Array<{ name: string; class?: string }>;
  reportParameters?: Array<{ name: string; class?: string }>;
  reportVariables?: Array<{ name: string; class?: string }>;
}

interface Emits {
  (e: "update:bands", bands: Band[]): void;
  (e: "delete-element"): void;
  (e: "update-jrxml"): void;
  (e: "save-state"): void;
  // Fit the selected text element's box to its text (done by the designer)
  (e: "fit-to-text"): void;
  (e: "update:reportStyles", styles: any[]): void;
  (
    e: "add-columns-to-group",
    params: {
      elementIndex: number;
      columnIndices: number[];
      bandIndex: number;
      parentFrameIndex?: number;
    },
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function getBandLimit(bandType: string) {
  if (!props.reportProperties) return { min: 20, max: 70 };
  if (!props.reportProperties.bandLimits) {
    props.reportProperties.bandLimits = getEffectiveDefaultBandLimits();
  }
  if (!props.reportProperties.bandLimits[bandType]) {
    props.reportProperties.bandLimits[bandType] = { min: 20, max: 70 };
  }
  return props.reportProperties.bandLimits[bandType];
}

function getMaxPhysicalHeight(bandType: string): number {
  const pageH = props.reportProperties?.pageHeight || 842;
  const topM = props.reportProperties?.topMargin || 20;
  const bottomM = props.reportProperties?.bottomMargin || 20;
  const printableH = pageH - topM - bottomM;
  let otherBandsH = 0;
  if (props.bands && Array.isArray(props.bands)) {
    props.bands.forEach((b) => {
      if (b.type !== bandType && b.type !== "detail" && b.type !== "background") {
        otherBandsH += b.height || 0;
      }
    });
  }
  // Leave at least 20px for detail band
  return Math.max(20, printableH - otherBandsH - 20);
}

function getMaxAllowedLimit(bandType: string): number {
  const pageH = props.reportProperties?.pageHeight || 842;
  const topM = props.reportProperties?.topMargin || 20;
  const bottomM = props.reportProperties?.bottomMargin || 20;
  const printableH = pageH - topM - bottomM;
  let otherBandsMin = 0;
  if (props.bands && Array.isArray(props.bands)) {
    props.bands.forEach((b) => {
      if (b.type !== bandType && b.type !== "detail" && b.type !== "background") {
        const limit = getBandLimit(b.type);
        otherBandsMin += Math.max(10, limit?.min || 10);
      }
    });
  }
  const detailMin = 10;
  return Math.max(10, printableH - otherBandsMin - detailMin);
}

function onTemplateMinChange(bandType: string) {
  const limit = getBandLimit(bandType);
  if (typeof limit.min === "number") {
    if (limit.min < 10) {
      limit.min = 10;
    }
    if (typeof limit.max === "number" && limit.min > limit.max) {
      limit.max = limit.min;
    }
  }
  const band = props.bands?.find((b) => b.type === bandType);
  if (band && typeof band.height === "number" && band.height < limit.min) {
    band.height = limit.min;
  }
  emit("update-jrxml");
}

function onTemplateMaxChange(bandType: string) {
  const limit = getBandLimit(bandType);
  const maxCeiling = getMaxAllowedLimit(bandType);
  if (typeof limit.max === "number") {
    if (limit.max < 10) {
      limit.max = 10;
    }
    if (limit.max > maxCeiling) {
      limit.max = maxCeiling;
    }
    if (typeof limit.min === "number" && limit.max < limit.min) {
      limit.min = limit.max;
    }
  }
  const band = props.bands?.find((b) => b.type === bandType);
  if (band && typeof band.height === "number" && band.height > limit.max) {
    band.height = limit.max;
  }
  emit("update-jrxml");
}

function resetTemplateBandLimitsToDefault() {
  if (!props.reportProperties) return;
  emit("save-state");
  const config = getEffectiveDefaultBandConfig();
  const limits: Record<string, { min: number; max: number }> = {};
  for (const key of Object.keys(config)) {
    const item = config[key];
    if (item) {
      limits[key] = { min: item.min, max: item.max };
    }
  }
  props.reportProperties.bandLimits = limits;

  if (props.bands && Array.isArray(props.bands)) {
    props.bands.forEach((band, index) => {
      const bConf = config[band.type];
      if (band.type !== "detail" && bConf?.defaultHeight) {
        band.height = bConf.defaultHeight;
        updateBandHeight(index);
      }
    });
  }
}

// Live preview (used for transition animation)
const { previewConfig, startPreview, stopPreview, confirmPreview } =
  useLivePreview({
    animated: true,
    animationDuration: 150,
  });

// List of available fonts
const availableFonts = ref<string[]>([]);

onMounted(async () => {
  availableFonts.value = await getAvailableFonts();
});

// Computed properties
const currentElement = computed(() => {
  if (props.selectedElement && props.bands && Array.isArray(props.bands)) {
    const band = props.bands[props.selectedElement.bandIndex];
    if (band && band.elements && Array.isArray(band.elements)) {
      // Check whether this is an element nested inside a Frame
      if (props.selectedElement.parentFrameIndex !== undefined) {
        const frame = band.elements[props.selectedElement.parentFrameIndex];
        if (frame && frame.type === "frame" && frame.elements) {
          return frame.elements[props.selectedElement.elementIndex];
        }
      } else {
        return band.elements[props.selectedElement.elementIndex];
      }
    }
  }
  return null;
});

// Compute the current element type
const elementType = computed(() => {
  return currentElement.value?.type || "";
});

// Style property visibility computed properties
const showTextColor = computed(() => {
  if (!currentElement.value) return false;
  return !["image", "line", "rectangle", "ellipse", "frame", "barcode", "chart"].includes(currentElement.value.type);
});

// Frame in the Background band: a border drawn on every page, with no fill or padding
const isPageBorder = computed(
  () =>
    currentElement.value?.type === "frame" &&
    !!props.selectedElement &&
    props.selectedElement.parentFrameIndex === undefined &&
    props.bands[props.selectedElement.bandIndex]?.type === "background",
);

const showBackgroundColor = computed(() => {
  if (!currentElement.value || isPageBorder.value) return false;
  return !["line", "barcode"].includes(currentElement.value.type);
});

const showFontName = computed(() => {
  if (!currentElement.value) return false;
  return !["line", "image", "frame", "rectangle", "ellipse", "barcode", "table", "chart"].includes(currentElement.value.type);
});

const showTextAlignmentAndStyle = computed(() => {
  if (!currentElement.value) return false;
  return !["line", "image", "frame", "rectangle", "ellipse", "barcode", "chart", "table"].includes(currentElement.value.type);
});

// Table row height settings
const tableRowHeights = ref({
  tableHeader: 30,
  columnHeader: 30,
  detailCell: 30,
  columnFooter: 30,
  tableFooter: 30,
});

// Table style selection
const tableStyles = ref({
  tableHeader: "Table_TH",
  columnHeader: "Table_CH",
  columnFooter: "Table_CH",
  detailCell: "Table_TD",
});

// Style management modal control
const showStyleManagerModal = ref(false);

// Frame property update handler
const handleFramePropertyUpdate = (updatedElement: any) => {
  if (currentElement.value && props.selectedElement) {
    const band = props.bands[props.selectedElement.bandIndex];
    if (band && band.elements) {
      if (props.selectedElement.parentFrameIndex !== undefined) {
        const frame = band.elements[props.selectedElement.parentFrameIndex];
        if (frame && frame.type === "frame" && frame.elements) {
          frame.elements[props.selectedElement.elementIndex] = updatedElement;
        }
      } else {
        band.elements[props.selectedElement.elementIndex] = updatedElement;
      }
      emit("update:bands", props.bands);
      emit("update-jrxml");
    }
  }
};

// Table property update handler
// Replace the selected element with an updated copy (used by the table and frame panels)
// Frame panel edits (border presets, layout): recorded for undo first
const replaceCurrentElement = (updatedElement: any) => {
  emit("save-state");
  handleTablePropertyUpdate(updatedElement);
};

const handleTablePropertyUpdate = (updatedElement: any) => {
  if (currentElement.value && props.selectedElement) {
    const band = props.bands[props.selectedElement.bandIndex];
    if (band && band.elements) {
      if (props.selectedElement.parentFrameIndex !== undefined) {
        const frame = band.elements[props.selectedElement.parentFrameIndex];
        if (frame && frame.type === "frame" && frame.elements) {
          frame.elements[props.selectedElement.elementIndex] = updatedElement;
        }
      } else {
        band.elements[props.selectedElement.elementIndex] = updatedElement;
      }
      emit("update:bands", props.bands);
      emit("update-jrxml");
    }
  }
};

// Add column
const addColumn = () => {
  if (currentElement.value && currentElement.value.type === "table") {
    if (!currentElement.value.columns) {
      currentElement.value.columns = [];
    }
    const newColumn = {
      uuid: crypto.randomUUID(),
      name: `Column ${currentElement.value.columns.length + 1}`,
      width: 100,
      columnHeader: {
        enable: true,
        element: {
          type: "textField",
          x: 0,
          y: 0,
          width: 100,
          height: 30,
          expression: `"Column ${currentElement.value.columns.length + 1}"`,
          textAlignment: "Center",
          verticalAlignment: "Middle",
        },
      },
      detailCell: {
        enable: true,
        element: {
          type: "textField",
          x: 0,
          y: 0,
          width: 100,
          height: 30,
          expression: "",
          textAlignment: "Center",
          verticalAlignment: "Middle",
        },
      },
    };
    (currentElement.value as any).columns.push(newColumn);
    emit("update-jrxml");
  }
};

// Delete column
const removeColumn = (index: number) => {
  if (
    currentElement.value &&
    currentElement.value.type === "table" &&
    currentElement.value.columns
  ) {
    currentElement.value.columns.splice(index, 1);
    emit("update-jrxml");
  }
};

// ==================== Column combination tree management ====================

const tableChildren = computed<(Column | ColumnGroup)[]>(() => {
  if (!currentElement.value || currentElement.value.type !== "table") return [];
  const el = currentElement.value as TableElement;
  if (el.children && el.children.length > 0) return el.children;
  // Initialize from columns when there are no children
  return el.columns || [];
});

function syncAndEmit() {
  if (!currentElement.value || currentElement.value.type !== "table") return;
  const el = currentElement.value as TableElement;
  // Ensure children exists
  if (!el.children) {
    el.children = [...(el.columns || [])];
  }
  syncTableColumns(el);
  emit("update-jrxml");
}

function ensureChildren() {
  if (!currentElement.value || currentElement.value.type !== "table") return;
  const el = currentElement.value as TableElement;
  if (!el.children) {
    el.children = [...(el.columns || [])];
  }
}

function handleAddRootColumn() {
  if (!currentElement.value || currentElement.value.type !== "table") return;
  emit("save-state");
  ensureChildren();
  const el = currentElement.value as TableElement;
  const count = (el.children || []).length;
  const newCol = createDefaultColumn(`Column ${count + 1}`);
  el.children!.push(newCol);
  syncAndEmit();
}

function handleAddRootGroup() {
  if (!currentElement.value || currentElement.value.type !== "table") return;
  emit("save-state");
  ensureChildren();
  const el = currentElement.value as TableElement;
  const count = (el.children || []).filter((c) => "children" in c).length;
  const newGroup = createDefaultColumnGroup(`Group ${count + 1}`);
  el.children!.push(newGroup);
  syncAndEmit();
}

function handleColumnNodeUpdate(uuid: string, updates: Partial<BaseColumn>) {
  emit("save-state");
  ensureChildren();
  const el = currentElement.value as TableElement;
  const result = findInParentArray(el.children!, uuid);
  if (result) {
    const node = result.parent[result.index];
    if (node) {
      Object.assign(node, updates);
      // If the width was updated, it needs to be synced
      if (updates.width !== undefined) {
        TableUtils.updateAllColumnGroupWidths(el.children!);
      }
      // If the name was updated, sync it to the cell
      if (updates.name !== undefined) {
        if (node.columnHeader?.element) {
          node.columnHeader.element.text = updates.name;
        }
      }
    }
  }
  syncAndEmit();
}

function handleColumnNodeDelete(uuid: string) {
  emit("save-state");
  ensureChildren();
  const el = currentElement.value as TableElement;
  const result = findInParentArray(el.children!, uuid);
  if (result) {
    result.parent.splice(result.index, 1);
  }
  syncAndEmit();
}

function handleAddColumnAfter(afterUuid: string) {
  emit("save-state");
  ensureChildren();
  const el = currentElement.value as TableElement;
  const result = findInParentArray(el.children!, afterUuid);
  if (result) {
    const newCol = createDefaultColumn(`Column ${result.parent.length + 1}`);
    result.parent.splice(result.index + 1, 0, newCol);
  }
  syncAndEmit();
}

function handleAddColumnChild(groupUuid: string) {
  emit("save-state");
  ensureChildren();
  const el = currentElement.value as TableElement;
  const result = findInParentArray(el.children!, groupUuid);
  if (result) {
    const group = result.parent[result.index] as ColumnGroup;
    if (group && "children" in group) {
      const newCol = createDefaultColumn(`Column ${group.children.length + 1}`);
      group.children.push(newCol);
    }
  }
  syncAndEmit();
}

function handleAddColumnGroupAfter(afterUuid: string) {
  emit("save-state");
  ensureChildren();
  const el = currentElement.value as TableElement;
  const result = findInParentArray(el.children!, afterUuid);
  if (result) {
    const newGroup = createDefaultColumnGroup(
      `Group ${result.parent.length + 1}`,
    );
    result.parent.splice(result.index + 1, 0, newGroup);
  }
  syncAndEmit();
}

function handleUngroupNode(groupUuid: string) {
  emit("save-state");
  ensureChildren();
  const el = currentElement.value as TableElement;
  ungroupColumnGroup(el.children!, groupUuid);
  syncAndEmit();
}

function handleMoveNode(uuid: string, direction: "up" | "down") {
  emit("save-state");
  ensureChildren();
  const el = currentElement.value as TableElement;
  const result = findInParentArray(el.children!, uuid);
  if (!result) return;
  const { parent, index } = result;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= parent.length) return;
  const temp = parent[index];
  const target = parent[targetIndex];
  if (temp && target) {
    parent[index] = target;
    parent[targetIndex] = temp;
  }
  syncAndEmit();
}

// Report style management
const reportStyles = ref<any[]>(
  props.reportStyles || [
    {
      name: "Table_TH",
      mode: "Opaque",
      backcolor: "#F0F8FF",
      forecolor: "#000000",
      forecolorMode: "Opaque",
      hTextAlign: "Center",
      hImageAlign: "Center",
      vTextAlign: "Middle",
      vImageAlign: "Middle",
      box: {
        pen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        topPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        leftPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        bottomPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        rightPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
      },
    },
    {
      name: "Table_CH",
      mode: "Opaque",
      backcolor: "#BFE1FF",
      forecolor: "#000000",
      forecolorMode: "Opaque",
      hTextAlign: "Center",
      hImageAlign: "Center",
      vTextAlign: "Middle",
      vImageAlign: "Middle",
      box: {
        pen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        topPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        leftPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        bottomPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        rightPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
      },
    },
    {
      name: "Table_TD",
      mode: "Opaque",
      backcolor: "#FFFFFF",
      forecolor: "#000000",
      forecolorMode: "Opaque",
      hTextAlign: "Left",
      hImageAlign: "Left",
      vTextAlign: "Middle",
      vImageAlign: "Middle",
      box: {
        pen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        topPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        leftPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        bottomPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        rightPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
      },
    },
  ],
);

// Save style changes
function saveStyleChanges() {
  emit("update:reportStyles", reportStyles.value);
  emit("update-jrxml");
  showStyleManagerModal.value = false;
}

// Cancel style changes
function cancelStyleChanges() {
  // Reset styles to their original state
  reportStyles.value = props.reportStyles || [
    {
      name: "Table_TH",
      mode: "Opaque",
      backcolor: "#F0F8FF",
      forecolor: "#000000",
      forecolorMode: "Opaque",
      hTextAlign: "Center",
      hImageAlign: "Center",
      vTextAlign: "Middle",
      vImageAlign: "Middle",
      box: {
        pen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        topPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        leftPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        bottomPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        rightPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
      },
    },
    {
      name: "Table_CH",
      mode: "Opaque",
      backcolor: "#BFE1FF",
      forecolor: "#000000",
      forecolorMode: "Opaque",
      hTextAlign: "Center",
      hImageAlign: "Center",
      vTextAlign: "Middle",
      vImageAlign: "Middle",
      box: {
        pen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        topPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        leftPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        bottomPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        rightPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
      },
    },
    {
      name: "Table_TD",
      mode: "Opaque",
      backcolor: "#FFFFFF",
      forecolor: "#000000",
      forecolorMode: "Opaque",
      hTextAlign: "Left",
      hImageAlign: "Left",
      vTextAlign: "Middle",
      vImageAlign: "Middle",
      box: {
        pen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        topPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        leftPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        bottomPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
        rightPen: {
          lineWidth: 0.5,
          lineColor: "#000000",
        },
      },
    },
  ];
  showStyleManagerModal.value = false;
}

// When the table element changes, update the row height settings and style selection
watch(
  () => currentElement.value,
  (newElement) => {
    if (newElement && newElement.type === "table") {
      // Get the current row height value from the column (divide by rowSpan to restore the single-row height)
      // Prefer reading from the columns array; fall back to the children array if empty
      let firstColumn: any = null;
      if (newElement.columns && newElement.columns.length > 0) {
        firstColumn = newElement.columns[0];
      } else if (newElement.children && newElement.children.length > 0) {
        // Find the first plain column within children
        for (const item of newElement.children) {
          if ("detailCell" in item) {
            firstColumn = item;
            break;
          }
        }
      }

      if (firstColumn) {
        console.log("Watch triggered! firstColumn.columnHeader:", {
          height: firstColumn.columnHeader?.height,
          rowSpan: firstColumn.columnHeader?.rowSpan,
          elementHeight: firstColumn.columnHeader?.element?.height,
        });

        const getBaseHeight = (cell: any) => {
          const h = cell?.element?.height ?? cell?.height;
          if (h === undefined || h === null || h === 0) {
            return undefined;
          }
          const rs = cell?.rowSpan || 1;
          const result = rs > 1 ? Math.round(h / rs) : h;
          console.log("getBaseHeight:", {
            inputHeight: h,
            rowSpan: rs,
            result,
          });
          return result;
        };
        console.log(
          "Watch: firstColumn.columnHeader before updating tableRowHeights:",
          firstColumn.columnHeader,
        );
        const headerHeight = getBaseHeight(firstColumn.tableHeader);
        const colHeaderHeight = getBaseHeight(firstColumn.columnHeader);
        const detailHeight = getBaseHeight(firstColumn.detailCell);
        const footerHeight = getBaseHeight(firstColumn.columnFooter);
        const tableFooterHeight = getBaseHeight(firstColumn.tableFooter);

        console.log("Watch: computed heights:", {
          headerHeight,
          colHeaderHeight,
          detailHeight,
          footerHeight,
          tableFooterHeight,
        });

        // Only update when a valid value was obtained, to avoid overwriting user input
        if (headerHeight !== undefined) {
          tableRowHeights.value.tableHeader = headerHeight;
        }
        if (colHeaderHeight !== undefined) {
          console.log(
            "Watch: updating tableRowHeights.columnHeader:",
            colHeaderHeight,
          );
          tableRowHeights.value.columnHeader = colHeaderHeight;
        }
        if (detailHeight !== undefined) {
          tableRowHeights.value.detailCell = detailHeight;
        }
        if (footerHeight !== undefined) {
          tableRowHeights.value.columnFooter = footerHeight;
        }
        if (tableFooterHeight !== undefined) {
          tableRowHeights.value.tableFooter = tableFooterHeight;
        }

        // Update the table style selection
        tableStyles.value.tableHeader =
          (firstColumn.tableHeader as any)?.style ?? "Table_TH";
        tableStyles.value.columnHeader =
          (firstColumn.columnHeader as any)?.style ?? "Table_CH";
        tableStyles.value.columnFooter =
          (firstColumn.columnFooter as any)?.style ?? "Table_CH";
        tableStyles.value.detailCell =
          (firstColumn.detailCell as any)?.style ?? "Table_TD";
      }
    }
  },
  { deep: true, immediate: true },
);

// Update the row height for all columns
function updateAllColumnRowHeights() {
  if (!currentElement.value || currentElement.value.type !== "table") return;

  // Collect all columns to process, avoiding duplicates
  const processedColumns = new Set<string>();

  console.log("Starting to update row heights for all columns:", {
    tableRowHeights: tableRowHeights.value,
    columnCount: currentElement.value.columns
      ? currentElement.value.columns.length
      : 0,
    groupCount: currentElement.value.children
      ? currentElement.value.children.length
      : 0,
  });

  // Process plain columns
  if (currentElement.value.columns) {
    currentElement.value.columns.forEach((column) => {
      if (!processedColumns.has(column.uuid)) {
        processedColumns.add(column.uuid);
        updateColumnRowHeights(column);
      } else {
        console.log("Skipping duplicate column:", column.name || column.uuid);
      }
    });
    console.log("Plain column row height update complete");
  }

  // Process grouped columns
  if (currentElement.value.children) {
    currentElement.value.children.forEach((item) => {
      // Check whether this is a group or a plain column
      if ("children" in item && item.children && item.children.length > 0) {
        // It's a ColumnGroup, process recursively
        updateGroupRowHeights(item);
      } else if ("detailCell" in item) {
        // It's a TableColumn (plain column), update detailCell directly
        console.log(
          "Updating top-level plain column detailCell:",
          item.name || item.uuid,
        );
        updateColumnRowHeights(item);
      }
    });
    console.log("Grouped column row height update complete");
  }

  console.log(
    "All column row heights updated, table element:",
    currentElement.value,
  );

  // Check merged column heights before emitting
  const tableElement = currentElement.value as any;
  if (tableElement?.columns) {
    tableElement.columns.forEach((col: any) => {
      if (
        col.columnHeader &&
        col.columnHeader.rowSpan &&
        col.columnHeader.rowSpan > 1
      ) {
        console.log("Checking merged column before emit:", {
          columnName: col.name,
          columnHeaderHeight: col.columnHeader.height,
          elementHeight: col.columnHeader.element?.height,
          rowSpan: col.columnHeader.rowSpan,
        });
      }
    });
  }

  // Use nextTick to ensure Vue finishes updating before firing the event, avoiding delayed tracking of nested reactive properties
  nextTick(() => {
    console.log("nextTick: firing update event");

    // Check the heights again within nextTick
    if (tableElement?.columns) {
      tableElement.columns.forEach((col: any) => {
        if (
          col.columnHeader &&
          col.columnHeader.rowSpan &&
          col.columnHeader.rowSpan > 1
        ) {
          console.log("Checking merged column in nextTick:", {
            columnName: col.name,
            columnHeaderHeight: col.columnHeader.height,
            elementHeight: col.columnHeader.element?.height,
            rowSpan: col.columnHeader.rowSpan,
          });
        }
      });
    }

    emit("update:bands", props.bands);

    // Check immediately after emit
    console.log("Checking merged column immediately after emit:");
    if (tableElement?.columns) {
      tableElement.columns.forEach((col: any) => {
        if (
          col.columnHeader &&
          col.columnHeader.rowSpan &&
          col.columnHeader.rowSpan > 1
        ) {
          console.log("Checking merged column after emit:", {
            columnName: col.name,
            columnHeaderHeight: col.columnHeader.height,
            elementHeight: col.columnHeader.element?.height,
            rowSpan: col.columnHeader.rowSpan,
          });
        }
      });
    }

    // Check whether Vue modified the height on the next tick
    nextTick(() => {
      console.log("Checking merged column on the second nextTick:");
      if (tableElement?.columns) {
        tableElement.columns.forEach((col: any) => {
          if (
            col.columnHeader &&
            col.columnHeader.rowSpan &&
            col.columnHeader.rowSpan > 1
          ) {
            console.log("Second nextTick check:", {
              columnName: col.name,
              columnHeaderHeight: col.columnHeader.height,
              elementHeight: col.columnHeader.element?.height,
              rowSpan: col.columnHeader.rowSpan,
            });
          }
        });
      }
    });

    emit("update-jrxml");
  });
}

// Update the row height for a single column
function updateColumnRowHeights(column: any) {
  console.log("Starting to update column row height:", column);

  if (column.tableHeader) {
    // Update the tableHeader's own height
    const tableHeaderHeight = tableRowHeights.value.tableHeader;
    column.tableHeader.height = tableHeaderHeight;
    console.log("Updating tableHeader height:", tableHeaderHeight);

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (column.tableHeader.reportElement) {
      column.tableHeader.reportElement.height = tableHeaderHeight;
    } else if (column.tableHeader.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      column.tableHeader.element.height = tableHeaderHeight;
    }

    // If this is a merged column, update the height to the row height times the row span
    if (column.tableHeader.rowSpan && column.tableHeader.rowSpan > 1) {
      const mergedHeight = tableHeaderHeight * column.tableHeader.rowSpan;
      column.tableHeader.height = mergedHeight;

      // The inner element's height needs to be adjusted accordingly
      if (column.tableHeader.reportElement) {
        column.tableHeader.reportElement.height = mergedHeight;
      } else if (column.tableHeader.element) {
        column.tableHeader.element.height = mergedHeight;
      }
    }
  }

  if (column.columnHeader) {
    // Update the columnHeader's own height
    const columnHeaderHeight = tableRowHeights.value.columnHeader;
    console.log("Before updating columnHeader height:", {
      currentValue: column.columnHeader.height,
      newValue: columnHeaderHeight,
      rowSpan: column.columnHeader.rowSpan,
      elementCurrentValue: column.columnHeader.element?.height,
    });
    column.columnHeader.height = columnHeaderHeight;
    console.log("After updating columnHeader.height:", {
      newValue: column.columnHeader.height,
      rowSpan: column.columnHeader.rowSpan,
    });

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (column.columnHeader.reportElement) {
      column.columnHeader.reportElement.height = columnHeaderHeight;
    } else if (column.columnHeader.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      column.columnHeader.element.height = columnHeaderHeight;
    }

    // If this is a merged column, update the height to the row height times the row span
    if (column.columnHeader.rowSpan && column.columnHeader.rowSpan > 1) {
      const mergedHeight = columnHeaderHeight * column.columnHeader.rowSpan;
      console.log("Merged column columnHeader height calculation:", {
        rowHeight: columnHeaderHeight,
        rowSpan: column.columnHeader.rowSpan,
        mergedHeight,
      });
      column.columnHeader.height = mergedHeight;

      // The inner element's height needs to be adjusted accordingly
      if (column.columnHeader.reportElement) {
        column.columnHeader.reportElement.height = mergedHeight;
      } else if (column.columnHeader.element) {
        column.columnHeader.element.height = mergedHeight;
      }
    }
  }

  if (column.detailCell) {
    // Update the detailCell's own height
    column.detailCell.height = tableRowHeights.value.detailCell;
    console.log(
      "Updating detailCell height:",
      tableRowHeights.value.detailCell,
      "column:",
      column,
    );
    // Update the inner element's height directly, since detailCell directly contains a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (column.detailCell.reportElement) {
      column.detailCell.reportElement.height = tableRowHeights.value.detailCell;
    } else if (column.detailCell.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      column.detailCell.element.height = tableRowHeights.value.detailCell;
    }
  }

  // Update columnFooter's height
  if (column.columnFooter) {
    // Update the columnFooter's own height
    const columnFooterHeight = tableRowHeights.value.columnFooter;
    column.columnFooter.height = columnFooterHeight;

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (column.columnFooter.reportElement) {
      column.columnFooter.reportElement.height = columnFooterHeight;
    } else if (column.columnFooter.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      column.columnFooter.element.height = columnFooterHeight;
    }

    // If this is a merged column, update the height to the row height times the row span
    if (column.columnFooter.rowSpan && column.columnFooter.rowSpan > 1) {
      const mergedHeight = columnFooterHeight * column.columnFooter.rowSpan;
      column.columnFooter.height = mergedHeight;

      // The inner element's height needs to be adjusted accordingly
      if (column.columnFooter.reportElement) {
        column.columnFooter.reportElement.height = mergedHeight;
      } else if (column.columnFooter.element) {
        column.columnFooter.element.height = mergedHeight;
      }
    }
  }

  // Update tableFooter's height
  if (column.tableFooter) {
    // Update the tableFooter's own height
    const tableFooterHeight = tableRowHeights.value.tableFooter;
    column.tableFooter.height = tableFooterHeight;

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (column.tableFooter.reportElement) {
      column.tableFooter.reportElement.height = tableFooterHeight;
    } else if (column.tableFooter.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      column.tableFooter.element.height = tableFooterHeight;
    }

    // If this is a merged column, update the height to the row height times the row span
    if (column.tableFooter.rowSpan && column.tableFooter.rowSpan > 1) {
      const mergedHeight = tableFooterHeight * column.tableFooter.rowSpan;
      column.tableFooter.height = mergedHeight;

      // The inner element's height needs to be adjusted accordingly
      if (column.tableFooter.reportElement) {
        column.tableFooter.reportElement.height = mergedHeight;
      } else if (column.tableFooter.element) {
        column.tableFooter.element.height = mergedHeight;
      }
    }
  }
}

// Update the combined column's header height so it matches the combined column's height
function updateGroupHeaderHeights(group: any) {
  // Get the combined column's height
  const groupHeight = group.height;

  console.log("Starting to update combined column header height:", {
    groupName: group.name,
    groupHeight,
    hasTableHeader: !!group.tableHeader,
    hasColumnHeader: !!group.columnHeader,
  });

  // Update the group's tableHeader height
  if (group.tableHeader) {
    // Update the tableHeader's own height
    group.tableHeader.height = groupHeight;

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (group.tableHeader.reportElement) {
      group.tableHeader.reportElement.height = groupHeight;
    } else if (group.tableHeader.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      group.tableHeader.element.height = groupHeight;
    }
    console.log("Updated tableHeader:", group.tableHeader);
  }

  // Update the group's columnHeader height
  if (group.columnHeader) {
    // Update the columnHeader's own height
    group.columnHeader.height = groupHeight;

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (group.columnHeader.reportElement) {
      group.columnHeader.reportElement.height = groupHeight;
    } else if (group.columnHeader.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      group.columnHeader.element.height = groupHeight;
    }
    console.log("Updated columnHeader:", group.columnHeader);
  }

  console.log(
    "Combined column header height update complete, updated combined column:",
    group,
  );
}

// Recursively update the row heights of a group
function updateGroupRowHeights(group: any) {
  // Update the group's tableHeader height
  if (group.tableHeader) {
    // Update the tableHeader's own height
    const tableHeaderHeight = tableRowHeights.value.tableHeader;
    group.tableHeader.height = tableHeaderHeight;

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (group.tableHeader.reportElement) {
      group.tableHeader.reportElement.height = tableHeaderHeight;
    } else if (group.tableHeader.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      group.tableHeader.element.height = tableHeaderHeight;
    }
    console.log("Updated tableHeader:", group.tableHeader);

    // If this is a merged column, update the height to the row height times the row span
    if (group.tableHeader.rowSpan && group.tableHeader.rowSpan > 1) {
      const mergedHeight = tableHeaderHeight * group.tableHeader.rowSpan;
      group.tableHeader.height = mergedHeight;

      // The inner element's height needs to be adjusted accordingly
      if (group.tableHeader.reportElement) {
        group.tableHeader.reportElement.height = mergedHeight;
      } else if (group.tableHeader.element) {
        group.tableHeader.element.height = mergedHeight;
      }
    }
  }

  // Update the group's columnHeader height
  if (group.columnHeader) {
    // Update the columnHeader's own height
    const columnHeaderHeight = tableRowHeights.value.columnHeader;
    group.columnHeader.height = columnHeaderHeight;

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (group.columnHeader.reportElement) {
      group.columnHeader.reportElement.height = columnHeaderHeight;
    } else if (group.columnHeader.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      group.columnHeader.element.height = columnHeaderHeight;
    }

    // If this is a merged column, update the height to the row height times the row span
    if (group.columnHeader.rowSpan && group.columnHeader.rowSpan > 1) {
      const mergedHeight = columnHeaderHeight * group.columnHeader.rowSpan;
      group.columnHeader.height = mergedHeight;

      // The inner element's height needs to be adjusted accordingly
      if (group.columnHeader.reportElement) {
        group.columnHeader.reportElement.height = mergedHeight;
      } else if (group.columnHeader.element) {
        group.columnHeader.element.height = mergedHeight;
      }
    }
  }

  // Update the group's columnFooter height
  if (group.columnFooter) {
    // Update the columnFooter's own height
    const columnFooterHeight = tableRowHeights.value.columnFooter;
    group.columnFooter.height = columnFooterHeight;

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (group.columnFooter.reportElement) {
      group.columnFooter.reportElement.height = columnFooterHeight;
    } else if (group.columnFooter.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      group.columnFooter.element.height = columnFooterHeight;
    }

    // If this is a merged column, update the height to the row height times the row span
    if (group.columnFooter.rowSpan && group.columnFooter.rowSpan > 1) {
      const mergedHeight = columnFooterHeight * group.columnFooter.rowSpan;
      group.columnFooter.height = mergedHeight;

      // The inner element's height needs to be adjusted accordingly
      if (group.columnFooter.reportElement) {
        group.columnFooter.reportElement.height = mergedHeight;
      } else if (group.columnFooter.element) {
        group.columnFooter.element.height = mergedHeight;
      }
    }
  }

  // Update the group's tableFooter height
  if (group.tableFooter) {
    // Update the tableFooter's own height
    const tableFooterHeight = tableRowHeights.value.tableFooter;
    group.tableFooter.height = tableFooterHeight;

    // Update the inner element's height directly, since these elements directly contain a textField rather than going through an elements array
    // Check and update the reportElement's height
    if (group.tableFooter.reportElement) {
      group.tableFooter.reportElement.height = tableFooterHeight;
    } else if (group.tableFooter.element) {
      // Update the inner element's height property to keep the design area rendering in sync
      group.tableFooter.element.height = tableFooterHeight;
    }

    // If this is a merged column, update the height to the row height times the row span
    if (group.tableFooter.rowSpan && group.tableFooter.rowSpan > 1) {
      const mergedHeight = tableFooterHeight * group.tableFooter.rowSpan;
      group.tableFooter.height = mergedHeight;

      // The inner element's height needs to be adjusted accordingly
      if (group.tableFooter.reportElement) {
        group.tableFooter.reportElement.height = mergedHeight;
      } else if (group.tableFooter.element) {
        group.tableFooter.element.height = mergedHeight;
      }
    }
  }

  // Recursively update child groups or columns
  if (group.children) {
    console.log("Number of child items in group:", group.children.length);
    group.children.forEach((child: any, index: number) => {
      console.log(`Processing child item [${index}]:`, {
        name: child.name,
        uuid: child.uuid,
        hasDetailCell: !!child.detailCell,
        hasChildren: !!child.children,
        childType: child.children ? "group" : "column",
      });
      if (child.children) {
        // Child group
        updateGroupRowHeights(child);
      } else {
        // Plain column
        updateColumnRowHeights(child);
      }
    });
  }
}

// Rectangle border style computed property
const rectangleBorderStyle = computed({
  get: () => {
    return getRectangleBorderStyle();
  },
  set: (value) => {
    setRectangleBorderStyle(value);
  },
});

// Get the Band's display name
function getBandDisplayName(bandType: string): string {
  // Use t() with dynamic key.
  // Assuming keys exist in bandNames section of locale files.
  return t(`bandNames.${bandType}`);
}

// Update Band height
function updateBandHeight(index: number) {
  const band = props.bands[index];
  if (band && band.type !== "detail") {
    const limit = getBandLimit(band.type);
    const maxAllowed = getMaxPhysicalHeight(band.type);
    if (typeof band.height === "number") {
      // Ensure band does not exceed physical page space
      if (band.height > maxAllowed) {
        band.height = maxAllowed;
      }
      const effectiveMin = Math.max(10, limit.min || 10);
      if (band.height < effectiveMin) {
        band.height = effectiveMin;
      }
      // If user inputs a height greater than current limit.max, auto-expand limit.max
      if (typeof limit.max === "number" && band.height > limit.max) {
        limit.max = band.height;
      }
      // If user inputs a height less than current limit.min, auto-adjust limit.min
      if (typeof limit.min === "number" && band.height < limit.min) {
        limit.min = Math.max(10, band.height);
      }
    }
  }

  // Recalculate Detail band height so it automatically absorbs the change (A4 page fitting)
  const detailBand = props.bands.find((b) => b.type === "detail");
  if (detailBand) {
    const pageH = props.reportProperties?.pageHeight || 842;
    const topM = props.reportProperties?.topMargin || 20;
    const bottomM = props.reportProperties?.bottomMargin || 20;
    const availableH = pageH - topM - bottomM;
    let otherBandsH = 0;
    props.bands.forEach((b) => {
      if (b.type !== "detail" && b.type !== "background") {
        otherBandsH += b.height || 0;
      }
    });
    detailBand.height = Math.max(20, availableH - otherBandsH);
  }

  // Callers take the undo snapshot before changing the height
  const updatedBands = [...props.bands];
  emit("update:bands", updatedBands);
  emit("update-jrxml");
}

// Apply a typed whole-number value (position, size, band height). The undo
// snapshot is taken before the value changes, and only when it really changes,
// so one edit is one undo step. Returns whether the value changed.
function setIntegerValue(target: any, property: string, event: Event): boolean {
  const input = event.target as HTMLInputElement;
  const parsed = Math.round(parseFloat(input.value));
  if (!Number.isFinite(parsed) || parsed === target[property]) {
    // Show the stored value again (e.g. after an empty or invalid entry)
    input.value = String(target[property] ?? "");
    return false;
  }
  emit("save-state");
  target[property] = parsed;
  // A ready-made box's own part keeps inside the box when its position or size is typed
  const parentIndex = props.selectedElement?.parentFrameIndex;
  if (
    parentIndex !== undefined &&
    target === currentElement.value &&
    isBoxPart(target) &&
    ["x", "y", "width", "height"].includes(property)
  ) {
    const box = props.bands[props.selectedElement!.bandIndex]?.elements[parentIndex];
    if (box?.type === "frame") Object.assign(target, clampRectInBox(target, box));
  }
  input.value = String(target[property]);
  emit("update-jrxml");
  return true;
}

// Set horizontal alignment
function setHorizontalAlignment(alignment: "Left" | "Center" | "Right") {
  if (currentElement.value) {
    emit("save-state");
    currentElement.value.textAlignment = alignment;
    emit("update-jrxml");
  }
}

// Set vertical alignment
function setVerticalAlignment(alignment: "Top" | "Middle" | "Bottom") {
  if (currentElement.value) {
    emit("save-state");
    currentElement.value.verticalAlignment = alignment;
    emit("update-jrxml");
  }
}

// Get the text field's expression
function getTextFieldExpression(element: any) {
  if (element.expression) {
    return element.expression;
  } else if (element.fieldName) {
    return `$F{${element.fieldName}}`;
  }
  return "";
}

// Update the text field's expression
function updateTextFieldExpression(newExpression: string) {
  if (!currentElement.value || currentElement.value.type !== "textField")
    return;

  emit("save-state");
  currentElement.value.expression = newExpression;

  emit("update-jrxml");
}

// Get clean text field content for display (strips quotes if static text, preserves field expressions)
function getTextFieldDisplay(element: any) {
  if (!element) return "";
  const raw = element.expression || (element.fieldName ? `$F{${element.fieldName}}` : "");
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/\\n/g, '\n');
  }
  return trimmed.replace(/\\n/g, '\n');
}

// Update text field content (wraps static text in quotes, preserves $F{...} / $V{...} expressions)
function updateTextFieldDisplay(val: string) {
  if (!currentElement.value || currentElement.value.type !== "textField") return;
  emit("save-state");
  const elem = currentElement.value as any;
  if (!elem.markup) {
    elem.markup = "html";
  }
  const trimmed = val.trim();
  if (!trimmed) {
    elem.expression = '""';
  } else if (trimmed.startsWith("$") || (trimmed.startsWith('"') && trimmed.endsWith('"')) || trimmed.includes("+")) {
    elem.expression = val;
  } else {
    elem.expression = `"${val}"`;
  }
  emit("update-jrxml");
}

// Insert a selected field into the text field
function insertFieldIntoTextField(fieldExpr: string) {
  if (!fieldExpr || !currentElement.value || currentElement.value.type !== "textField") return;
  emit("save-state");
  currentElement.value.expression = fieldExpr;
  emit("update-jrxml");
}

// Set rotation for text, image, and barcode elements
function setElementRotation(rot: "None" | "Right" | "UpsideDown" | "Left") {
  if (!currentElement.value) return;
  emit("save-state");
  (currentElement.value as any).rotation = rot;
  emit("update-jrxml");
}

// Current orientation of selected line element
const currentLineOrientation = computed(() => {
  if (!currentElement.value || currentElement.value.type !== "line") return "";
  const el = currentElement.value as any;
  if (el.height <= 1) return "horizontal";
  if (el.width <= 1) return "vertical";
  return el.lineDirection === "BottomUp" ? "bottomup" : "topdown";
});

// Set orientation for line element
function setLineOrientation(type: "horizontal" | "vertical" | "topdown" | "bottomup") {
  if (!currentElement.value || currentElement.value.type !== "line") return;
  emit("save-state");
  const el = currentElement.value as any;
  if (type === "horizontal") {
    el.height = 1;
    if (el.width <= 1) el.width = 150;
    el.lineDirection = "TopDown";
  } else if (type === "vertical") {
    el.width = 1;
    if (el.height <= 1) el.height = 100;
    el.lineDirection = "TopDown";
  } else if (type === "topdown") {
    if (el.height <= 1) el.height = 50;
    if (el.width <= 1) el.width = 100;
    el.lineDirection = "TopDown";
  } else if (type === "bottomup") {
    if (el.height <= 1) el.height = 50;
    if (el.width <= 1) el.width = 100;
    el.lineDirection = "BottomUp";
  }
  emit("update-jrxml");
}

// Add a crossing line element to form an "X"
function addCrossingLine() {
  if (
    !currentElement.value ||
    currentElement.value.type !== "line" ||
    !props.selectedElement ||
    !props.bands
  )
    return;
  emit("save-state");
  const el = currentElement.value as any;
  if (el.width <= 1) el.width = 100;
  if (el.height <= 1) el.height = 60;

  const currentDir = el.lineDirection || "TopDown";
  const oppositeDir = currentDir === "BottomUp" ? "TopDown" : "BottomUp";

  const crossLine: any = {
    ...JSON.parse(JSON.stringify(el)),
    uuid: crypto.randomUUID(),
    lineDirection: oppositeDir,
  };

  const band = props.bands[props.selectedElement.bandIndex];
  if (band && band.elements) {
    if (props.selectedElement.parentFrameIndex !== undefined) {
      const frame = band.elements[props.selectedElement.parentFrameIndex];
      if (frame && frame.type === "frame" && frame.elements) {
        frame.elements.push(crossLine);
      }
    } else {
      band.elements.push(crossLine);
    }
  }
  emit("update-jrxml");
}

// Get clean barcode value for display (without quotes if static text)
function getBarcodeValue(element: any) {
  if (!element || !element.codeExpression) return "";
  const raw = String(element.codeExpression).trim();
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1);
  }
  return raw;
}

// Update barcode value (wraps plain text in quotes, preserves $F{...} expressions)
function updateBarcodeValue(val: string) {
  if (!currentElement.value || currentElement.value.type !== "barcode") return;
  // Typing the value is one undo step
  recordBorderEdit("barcode-value");
  const trimmed = val.trim();
  if (!trimmed) {
    currentElement.value.codeExpression = '""';
  } else if (trimmed.startsWith("$") || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    currentElement.value.codeExpression = trimmed;
  } else {
    currentElement.value.codeExpression = `"${trimmed}"`;
  }
  emit("update-jrxml");
}

// Image upload handling for Image elements in Properties panel
const propImageFileInputRef = ref<HTMLInputElement | null>(null);
const isPropertiesImageUploading = ref(false);

function triggerPropertiesImageUpload() {
  if (propImageFileInputRef.value) {
    propImageFileInputRef.value.value = "";
    propImageFileInputRef.value.click();
  }
}

// Image name handling for Image elements in the Properties panel.
// The name is read-only: it is filled in automatically when an image is uploaded
// and is never edited manually, so the image expression is never modified.
async function handlePropertiesImageUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  const element = currentElement.value;
  if (!file || !element || isPropertiesImageUploading.value) return;

  isPropertiesImageUploading.value = true;
  try {
    const source = await resolveImageSource(file);
    // The upload is async: apply it to the element that started it, even if selection changed
    if (element.type !== "image") return;
    emit("save-state");
    (element as any).imageExpression = toImageExpression(source);
    // Use the uploaded file name as the image name shown in the panels
    setImageName(element, file.name || "");
    // A crop belongs to the previous picture
    setImageCrop(element, null);
    emit("update-jrxml");
  } catch (error) {
    console.error("Image upload failed:", error);
    alert(
      error instanceof ImageUploadError
        ? t(error.messageKey, error.params)
        : t("imageUpload.uploadFailed"),
    );
  } finally {
    isPropertiesImageUploading.value = false;
  }
}

// Border editors write into element.box; create it for elements that have none yet
function ensureElementBox(): void {
  if (currentElement.value && !currentElement.value.box) currentElement.value.box = {};
}

// Corner radius of the selected image, text or box. Images and text fields
// store it as a JRXML property (IMAGE_ / TEXT_CORNER_RADIUS_PROPERTY);
// boxes as radius / cornerRadii (BOX_CORNER_RADIUS_PROPERTY). null = no corner
// radius for this element.
const readCornerRadii = (element: any): CornerRadii | null =>
  element?.type === "image" || element?.type === "textField"
    ? getPropertyCornerRadii(element)
    : element?.type === "frame"
      ? getBoxCornerRadii(element)
      : null;

const cornerRadii = computed(() => readCornerRadii(currentElement.value));

// Border editor: one row per side, "all" sets the four at once
type BorderRow = "all" | "top" | "right" | "bottom" | "left";
const BORDER_ROWS: BorderRow[] = ["all", "top", "right", "bottom", "left"];
const borderRowLabel = (row: BorderRow) =>
  row === "all" ? t("properties.all") : t(`properties.${row}Side`);

const LINE_STYLES = [
  { value: "", labelKey: "properties.none" },
  { value: "Solid", labelKey: "properties.solid" },
  { value: "Dashed", labelKey: "properties.dashed" },
  { value: "Dotted", labelKey: "properties.dotted" },
  { value: "Double", labelKey: "properties.double" },
];

// Line-style sample drawn with a CSS border of that style
const penSwatchClass = (value: string) => `is-${(value || "Solid").toLowerCase()}`;

const getRowBorderStyle = (row: BorderRow) =>
  row === "all" ? getUnifiedBorderStyle() : getSideBorderStyle(row);
const getRowBorderWidth = (row: BorderRow) =>
  row === "all" ? getUnifiedBorderWidth() : getSideBorderWidth(row);
const getRowBorderColor = (row: BorderRow) =>
  row === "all" ? getUnifiedBorderColor() : getSideBorderColor(row);

function setRowBorderStyle(row: BorderRow, value: string) {
  if (row === "all") return setUnifiedBorderStyle(value);
  ensureElementBox();
  setSideBorderStyle(row, value);
}
function setRowBorderWidth(row: BorderRow, value: string) {
  if (row === "all") return setUnifiedBorderWidth(value);
  ensureElementBox();
  setSideBorderWidth(row, value);
}
function setRowBorderColor(row: BorderRow, value: string) {
  if (row === "all") return setUnifiedBorderColor(value);
  ensureElementBox();
  setSideBorderColor(row, value);
}

// Margins: one field per side around a preview of the inner area
const MARGIN_SIDES = ["top", "left", "right", "bottom"] as const;
const getMarginValue = (side: (typeof MARGIN_SIDES)[number]) => {
  const box = currentElement.value?.box;
  return box?.[`${side}Padding`] ?? box?.padding ?? "";
};
const marginPreviewStyle = computed(() => {
  const inset = (side: (typeof MARGIN_SIDES)[number]) =>
    `${Math.min(14, (Number(getMarginValue(side)) || 0) / 2)}px`;
  return { top: inset("top"), left: inset("left"), right: inset("right"), bottom: inset("bottom") };
});

const panelTitle = computed(() => {
  const el = currentElement.value as any;
  if (!props.selectedElement || !el) return t("properties.reportProperties");
  if (isPagination(el)) return t("elementNames.pageNumber");
  if (isPageBorder.value) return t("elementNames.framePageBorder");
  return t(getElementTypeName(el.type));
});

// Element tabs. The open tab is kept when another element is selected, unless
// that element doesn't have it (e.g. Table Properties): then Basic opens, instead
// of an empty panel.
const activeTab = ref("basic");
const TAB_LABELS: Record<string, string> = {
  basic: "properties.basicProperties",
  table: "properties.tableProperties",
  style: "properties.styleSettings",
};
const availableTabs = computed(() =>
  currentElement.value?.type === "table" ? ["basic", "table", "style"] : ["basic", "style"],
);
watch(availableTabs, (tabs) => {
  if (!tabs.includes(activeTab.value)) activeTab.value = "basic";
});

// Basic tab
const GEOMETRY_FIELDS = ["x", "y", "width", "height"] as const;
const ROTATIONS = [
  { value: "None", deg: 0, titleKey: "properties.rotationNone" },
  { value: "Right", deg: 90, titleKey: "properties.rotationRight" },
  { value: "UpsideDown", deg: 180, titleKey: "properties.rotationUpsideDown" },
  { value: "Left", deg: 270, titleKey: "properties.rotationLeft" },
] as const;
const LINE_ORIENTATIONS = [
  { value: "horizontal", icon: Minus, iconStyle: undefined, labelKey: "properties.lineHorizontal", titleKey: "properties.lineHorizontalTitle" },
  { value: "vertical", icon: Minus, iconStyle: { transform: "rotate(90deg)" }, labelKey: "properties.lineVertical", titleKey: "properties.lineVerticalTitle" },
  { value: "topdown", icon: Slash, iconStyle: { transform: "scaleX(-1)" }, labelKey: "properties.lineTopDown", titleKey: "properties.lineTopDownTitle" },
  { value: "bottomup", icon: Slash, iconStyle: undefined, labelKey: "properties.lineBottomUp", titleKey: "properties.lineBottomUpTitle" },
] as const;
// A line is always drawn: no "None"
const LINE_ONLY_STYLES = LINE_STYLES.filter((line) => line.value !== "");
// Rectangle / ellipse outline: no "None" (always drawn)
const SHAPE_STYLES = LINE_ONLY_STYLES;
// JasperReports draws a Double pen as two lines a third of the pen width each,
// so below 3pt it prints (and shows on the canvas) as one solid line
const MIN_DOUBLE_LINE_WIDTH = 3;

// Chart types offered in the picker (the ones the generator writes fully);
// an imported chart of another type keeps its own type in the list
const CHART_TYPES = [
  "pie", "pie3D", "bar", "bar3D", "stackedBar", "stackedBar3D",
  "line", "area", "stackedArea", "xyLine", "xyArea", "xyBar", "scatter",
];
const PIE_CHARTS = ["pie", "pie3D"];
const XY_CHARTS = ["xyLine", "xyArea", "xyBar", "scatter", "bubble", "timeSeries", "highLow", "candlestick"];

const chartTypeOptions = computed(() => {
  const current = (currentElement.value as any)?.chartType;
  return current && !CHART_TYPES.includes(current) ? [current, ...CHART_TYPES] : CHART_TYPES;
});

// The expressions a chart of this type reads (same split as the generator)
const chartDataFields = computed(() => {
  const type = (currentElement.value as any)?.chartType || "pie";
  if (PIE_CHARTS.includes(type)) {
    return [
      { key: "keyExpression", labelKey: "chart.fields.key" },
      { key: "valueExpression", labelKey: "chart.fields.value" },
    ];
  }
  if (XY_CHARTS.includes(type)) {
    return [
      { key: "seriesExpression", labelKey: "chart.fields.series" },
      { key: "xValueExpression", labelKey: "chart.fields.x" },
      { key: "yValueExpression", labelKey: "chart.fields.y" },
    ];
  }
  return [
    { key: "seriesExpression", labelKey: "chart.fields.series" },
    { key: "categoryExpression", labelKey: "chart.fields.category" },
    { key: "valueExpression", labelKey: "chart.fields.value" },
  ];
});
const chartDataHintKey = computed(() => {
  const type = (currentElement.value as any)?.chartType || "pie";
  if (PIE_CHARTS.includes(type)) return "chart.hints.pie";
  if (XY_CHARTS.includes(type)) return "chart.hints.xy";
  return "chart.hints.category";
});

// Title: plain text is stored as a quoted expression, $F{}/$P{} as typed
const chartTitleText = computed(() => {
  const el = currentElement.value as any;
  if (!el) return "";
  return el.titleExpression ? stripExpressionQuotes(el.titleExpression) : el.title || "";
});
function setChartTitle(value: string) {
  const el = currentElement.value as any;
  const text = value.trim();
  const expression = text ? quoteExpressionValue(text) : "";
  if (!el || (el.titleExpression || "") === expression) return;
  emit("save-state");
  el.titleExpression = expression;
  el.title = undefined;
  emit("update-jrxml");
}

// Barcode symbologies (value = JasperReports barcode type)
const BARCODE_TYPES = [
  { value: "Code128", label: "Code 128" },
  { value: "Code39", label: "Code 39" },
  { value: "EAN13", label: "EAN-13" },
  { value: "EAN8", label: "EAN-8" },
  { value: "UPCA", label: "UPC-A" },
  { value: "UPCE", label: "UPC-E" },
  { value: "QRCode", label: "QR Code" },
  { value: "DataMatrix", label: "Data Matrix" },
  { value: "Interleaved2Of5", label: "Interleaved 2 of 5" },
  { value: "Codabar", label: "Codabar" },
  { value: "EAN128", label: "EAN-128" },
  { value: "PDF417", label: "PDF417" },
];

// Table tab
const TABLE_ROW_HEIGHTS = [
  { key: "tableHeader", labelKey: "properties.headerRowHeight" },
  { key: "columnHeader", labelKey: "properties.columnHeaderRowHeight" },
  { key: "detailCell", labelKey: "properties.dataRowHeight" },
  { key: "columnFooter", labelKey: "properties.columnFooterRowHeight" },
  { key: "tableFooter", labelKey: "properties.tableFooterRowHeight" },
] as const;
const TABLE_STYLE_PARTS = [
  { key: "tableHeader", labelKey: "properties.tableHeader" },
  { key: "columnHeader", labelKey: "properties.columnHeader" },
  { key: "columnFooter", labelKey: "properties.columnFooter" },
  { key: "detailCell", labelKey: "properties.detailCell" },
] as const;

function setTableRowHeight(key: (typeof TABLE_ROW_HEIGHTS)[number]["key"], event: Event) {
  const input = event.target as HTMLInputElement;
  const value = Math.round(parseFloat(input.value));
  if (!Number.isFinite(value) || value < 1 || value === tableRowHeights.value[key]) {
    input.value = String(tableRowHeights.value[key]);
    return;
  }
  emit("save-state");
  tableRowHeights.value[key] = value;
  updateAllColumnRowHeights();
}

function setTableStyle(key: (typeof TABLE_STYLE_PARTS)[number]["key"], value: string) {
  if (tableStyles.value[key] === value) return;
  emit("save-state");
  tableStyles.value[key] = value;
  updateTableStyles();
  emit("update-jrxml");
}

// Text card
const FONT_TOGGLES = [
  { key: "isBold", glyph: "B", labelKey: "properties.bold" },
  { key: "isItalic", glyph: "I", labelKey: "properties.italic" },
  { key: "isUnderline", glyph: "U", labelKey: "properties.underline" },
] as const;
const H_ALIGNS = [
  { value: "Left", labelKey: "properties.left", icon: TextAlignStart },
  { value: "Center", labelKey: "properties.center", icon: TextAlignCenter },
  { value: "Right", labelKey: "properties.right", icon: TextAlignEnd },
] as const;
const V_ALIGNS = [
  { value: "Top", labelKey: "properties.top", icon: AlignVerticalJustifyStart },
  { value: "Middle", labelKey: "properties.middle", icon: AlignVerticalJustifyCenter },
  { value: "Bottom", labelKey: "properties.bottom", icon: AlignVerticalJustifyEnd },
] as const;

// One undo step per change
function setTextProperty(key: string, value: unknown) {
  const element = currentElement.value as any;
  if (!element || element[key] === value) return;
  emit("save-state");
  element[key] = value;
  emit("update-jrxml");
}

function setFontSize(value: string) {
  const size = Math.round(parseFloat(value));
  setTextProperty("fontSize", Number.isFinite(size) && size > 0 ? size : undefined);
}

// Colour pickers send the colour and then the mode (and repeat while the
// opacity slider moves): these share one undo step per colour
function setColorProperty(group: string, key: string, value: unknown) {
  const element = currentElement.value as any;
  if (!element || element[key] === value) return;
  recordBorderEdit(`color-${group}`);
  element[key] = value;
  emit("update-jrxml");
}

// Corner preview: the radii, scaled down to fit the small box
const cornerPreviewRadius = computed(() => {
  const radii = cornerRadii.value;
  if (!radii) return undefined;
  return CORNER_NAMES.map((c) => `${Math.min(16, radii[c] / 2)}px`).join(" ");
});
const cornerPreviewStyle = computed(() => ({ borderRadius: cornerPreviewRadius.value }));

// Corner fields laid out as they sit on the element: top row, then bottom row
const CORNER_GRID: CornerName[] = ["topLeft", "topRight", "bottomLeft", "bottomRight"];

// "All" shows the value only when every corner has it
const sharedCornerRadius = computed(() => {
  const radii = cornerRadii.value;
  if (!radii) return "";
  const first = radii.topLeft;
  return CORNER_NAMES.every((c) => radii[c] === first) ? first : "";
});

// corner null = all four corners
function setCornerRadius(corner: CornerName | null, value: string) {
  const element = currentElement.value as any;
  const current = readCornerRadii(element);
  if (!current) return;
  const radius = Math.max(0, Math.round(parseFloat(value) || 0));
  const next = { ...current };
  for (const c of corner ? [corner] : CORNER_NAMES) next[c] = radius;
  if (CORNER_NAMES.every((c) => next[c] === current[c])) return;
  emit("save-state");
  if (element.type === "frame") setBoxCornerRadii(element, next);
  else setPropertyCornerRadii(element, next);
  emit("update-jrxml");
}

// Undo step for a border edit. Repeated edits of the same control in quick
// succession (typing a width, dragging the colour picker) share one step.
let lastBorderEdit = { key: "", time: 0 };
function recordBorderEdit(key: string) {
  const now = Date.now();
  if (key !== lastBorderEdit.key || now - lastBorderEdit.time > 1000) {
    emit("save-state");
  }
  lastBorderEdit = { key, time: now };
}

// Per-side border property accessor functions
function getSideBorderWidth(side: string): number {
  if (!currentElement.value?.box) return 0;
  const box = currentElement.value.box;
  const penKey = `${side}Pen`;
  const widthKey = `${side}BorderWidth`;
  if (box[widthKey] !== undefined) return box[widthKey];
  if (box[penKey]?.lineWidth !== undefined) return box[penKey].lineWidth;
  // Fallback to global pen
  if (box.pen?.lineWidth !== undefined) return box.pen.lineWidth;
  return 0;
}

function setSideBorderWidth(side: string, value: string, record = true) {
  ensureElementBox();
  if (!currentElement.value?.box) return;
  const numValue = parseFloat(value) || 0;
  const widthKey = `${side}BorderWidth`;
  const penKey = `${side}Pen`;
  if (record) recordBorderEdit(`setSideBorderWidth:${side}`);
  currentElement.value.box[widthKey] = numValue;
  if (!currentElement.value.box[penKey]) {
    currentElement.value.box[penKey] = {};
  }
  currentElement.value.box[penKey].lineWidth = numValue;
  emit("update-jrxml");
}

function getSideBorderStyle(side: string): string {
  if (!currentElement.value?.box) return "";
  const box = currentElement.value.box;
  const penKey = `${side}Pen`;
  const styleKey = `${side}BorderStyle`;
  if (box[styleKey] !== undefined) return box[styleKey];
  if (box[penKey]?.lineStyle !== undefined) return box[penKey].lineStyle;
  // Fallback to global pen
  if (box.pen?.lineStyle !== undefined) return box.pen.lineStyle;
  // A drawn line without a style is Solid (JasperReports' default)
  return getSideBorderWidth(side) > 0 ? "Solid" : "";
}

function setSideBorderStyle(side: string, value: string, record = true) {
  ensureElementBox();
  if (!currentElement.value?.box) return;
  const box = currentElement.value.box;
  const styleKey = `${side}BorderStyle`;
  const penKey = `${side}Pen`;
  if (record) recordBorderEdit(`setSideBorderStyle:${side}`);

  // Set the border style
  box[styleKey] = value;
  if (!box[penKey]) {
    box[penKey] = {};
  }
  box[penKey].lineStyle = value;

  // Automatically adjust the border width based on the style
  if (value && value !== "") {
    // Not the "None" style; a side that was off takes the width and colour of
    // a side that is on (or 1pt black if none is)
    if (!box[penKey].lineWidth || box[penKey].lineWidth <= 0) {
      const source = drawnSides().find((s) => s !== side);
      const width = source ? getSideBorderWidth(source) : 1;
      const color = source ? getSideBorderColor(source) : getSideBorderColor(side);
      box[penKey].lineWidth = width;
      box[`${side}BorderWidth`] = width;
      box[penKey].lineColor = color;
      box[`${side}BorderColor`] = color;
    }
  } else {
    // The "None" style; default the width to 0
    box[penKey].lineWidth = 0;
    const widthKey = `${side}BorderWidth`;
    box[widthKey] = 0;
  }

  emit("update-jrxml");
}

function getSideBorderColor(side: string): string {
  if (!currentElement.value?.box) return "#000000";
  const box = currentElement.value.box;
  const penKey = `${side}Pen`;
  const colorKey = `${side}BorderColor`;
  if (box[colorKey] !== undefined) return box[colorKey];
  if (box[penKey]?.lineColor !== undefined) return box[penKey].lineColor;
  // Fallback to global pen
  if (box.pen?.lineColor !== undefined) return box.pen.lineColor;
  return "#000000";
}

function setSideBorderColor(side: string, value: string, record = true) {
  ensureElementBox();
  if (!currentElement.value?.box) return;
  const box = currentElement.value.box;
  const colorKey = `${side}BorderColor`;
  const penKey = `${side}Pen`;
  if (record) recordBorderEdit(`setSideBorderColor:${side}`);
  box[colorKey] = value;
  if (!box[penKey]) {
    box[penKey] = {};
  }
  box[penKey].lineColor = value;
  emit("update-jrxml");
}

// Functions related to the unified four-side setting ("All" row).
// Width and colour change only the sides that are on; the style switches every
// side on or off. Values that differ between the sides that are on show empty.
const BORDER_SIDE_NAMES = ["top", "left", "bottom", "right"];

function drawnSides(): string[] {
  return BORDER_SIDE_NAMES.filter((side) => getSideBorderWidth(side) > 0);
}

// Sides the "All" row edits: the ones that are on, or all four when none is
function unifiedTargetSides(): string[] {
  const drawn = drawnSides();
  return drawn.length > 0 ? drawn : BORDER_SIDE_NAMES;
}

function sharedValue<T>(values: T[], empty: T): T {
  return values.length > 0 && values.every((v) => v === values[0]) ? values[0]! : empty;
}

function getUnifiedBorderStyle(): string | null {
  if (!currentElement.value?.box) return "";
  // "None" only when every side is off; nothing selected when the sides differ
  return sharedValue<string | null>(BORDER_SIDE_NAMES.map((side) => getSideBorderStyle(side)), null);
}

function setUnifiedBorderStyle(value: string) {
  ensureElementBox();
  if (!currentElement.value?.box) return;
  recordBorderEdit("setUnifiedBorderStyle");
  BORDER_SIDE_NAMES.forEach((side) => {
    setSideBorderStyle(side, value, false);
  });
  emit("update-jrxml");
}

function getUnifiedBorderWidth(): number | "" {
  if (!currentElement.value?.box) return "";
  return sharedValue<number | "">(drawnSides().map((side) => getSideBorderWidth(side)), "");
}

function setUnifiedBorderWidth(value: string) {
  ensureElementBox();
  if (!currentElement.value?.box) return;
  recordBorderEdit("setUnifiedBorderWidth");
  const targets = unifiedTargetSides();
  // Turning on a border from nothing: new sides need a style too
  const turningOn = drawnSides().length === 0 && (parseFloat(value) || 0) > 0;
  targets.forEach((side) => {
    if (turningOn) setSideBorderStyle(side, "Solid", false);
    setSideBorderWidth(side, value, false);
  });
  emit("update-jrxml");
}

function getUnifiedBorderColor(): string {
  if (!currentElement.value?.box) return "#000000";
  return sharedValue(drawnSides().map((side) => getSideBorderColor(side)), "#000000");
}

function setUnifiedBorderColor(value: string) {
  ensureElementBox();
  if (!currentElement.value?.box) return;
  recordBorderEdit("setUnifiedBorderColor");
  unifiedTargetSides().forEach((side) => {
    setSideBorderColor(side, value, false);
  });
  emit("update-jrxml");
}

// Handle Global Margin input: sets all four sides and global padding
function handleGlobalMarginInput(event: Event) {
  if (!currentElement.value) return;
  if (!currentElement.value.box) {
    currentElement.value.box = {};
  }
  const input = event.target as HTMLInputElement;
  const rawVal = input.value;
  emit("save-state");

  if (rawVal === "" || rawVal === undefined || rawVal === null) {
    currentElement.value.box.padding = undefined;
    currentElement.value.box.topPadding = undefined;
    currentElement.value.box.bottomPadding = undefined;
    currentElement.value.box.leftPadding = undefined;
    currentElement.value.box.rightPadding = undefined;
  } else {
    const num = Math.max(0, parseFloat(rawVal) || 0);
    currentElement.value.box.padding = num;
    currentElement.value.box.topPadding = num;
    currentElement.value.box.bottomPadding = num;
    currentElement.value.box.leftPadding = num;
    currentElement.value.box.rightPadding = num;
  }
  emit("update-jrxml");
}

// Handle individual side margin input: resets global padding and sets specific side
function handleSideMarginInput(
  side: "top" | "left" | "bottom" | "right",
  event: Event,
) {
  if (!currentElement.value) return;
  if (!currentElement.value.box) {
    currentElement.value.box = {};
  }
  const box = currentElement.value.box;
  const input = event.target as HTMLInputElement;
  const rawVal = input.value;
  emit("save-state");

  // If individual margins weren't explicitly initialized yet but global padding was set,
  // seed the other sides with the current global value before diverging.
  const prevGlobal =
    box.padding !== undefined && !isNaN(Number(box.padding))
      ? Number(box.padding)
      : undefined;

  if (prevGlobal !== undefined) {
    if (box.topPadding === undefined) box.topPadding = prevGlobal;
    if (box.leftPadding === undefined) box.leftPadding = prevGlobal;
    if (box.bottomPadding === undefined) box.bottomPadding = prevGlobal;
    if (box.rightPadding === undefined) box.rightPadding = prevGlobal;
  }

  // Reset global margin value so it doesn't conflict or falsely indicate all sides are equal
  box.padding = undefined;

  const key = `${side}Padding` as "topPadding" | "leftPadding" | "bottomPadding" | "rightPadding";
  if (rawVal === "" || rawVal === undefined || rawVal === null) {
    box[key] = undefined;
  } else {
    box[key] = Math.max(0, parseFloat(rawVal) || 0);
  }

  // If all four sides happen to be defined and equal, synchronize global margin
  if (
    box.topPadding !== undefined &&
    box.topPadding === box.bottomPadding &&
    box.topPadding === box.leftPadding &&
    box.topPadding === box.rightPadding
  ) {
    box.padding = box.topPadding;
  }

  emit("update-jrxml");
}

// Initialize the table cell
function initTableCell(column: any, cellType: "tableFooter" | "columnFooter") {
  if (!column[cellType]) {
    column[cellType] = {
      enable: false,
      element: {
        type: "textField",
        x: 0,
        y: 0,
        width: column.width,
        height: 30,
        expression: "",
        backcolor: "",
        mode: "Transparent",
      },
    };
  }
}

// Update the column width, also updating the width of all related cells, and recalculate the table's total width
function updateColumnWidth(column: any, index: number) {
  if (!column || !currentElement) return;

  const newWidth = column.width;

  // Update the width of all related cells
  if (column.tableHeader) {
    if (column.tableHeader.element) {
      column.tableHeader.element.width = newWidth;
    } else {
      column.tableHeader.width = newWidth;
    }
  }
  if (column.columnHeader) {
    if (column.columnHeader.element) {
      column.columnHeader.element.width = newWidth;
    } else {
      column.columnHeader.width = newWidth;
    }
  }
  if (column.detailCell) {
    if (column.detailCell.element) {
      column.detailCell.element.width = newWidth;
    } else {
      column.detailCell.width = newWidth;
    }
  }
  if (column.columnFooter) {
    if (column.columnFooter.element) {
      column.columnFooter.element.width = newWidth;
    } else {
      column.columnFooter.width = newWidth;
    }
  }
  if (column.tableFooter) {
    if (column.tableFooter.element) {
      column.tableFooter.element.width = newWidth;
    } else {
      column.tableFooter.width = newWidth;
    }
  }

  // If the table has a children property, also update the corresponding column's width within children
  if (
    currentElement.value &&
    currentElement.value.type === "table" &&
    currentElement.value.children
  ) {
    // Find the corresponding column in children (by uuid or index)
    const childColumn = findColumnInChildren(
      currentElement.value.children,
      column,
    );
    if (childColumn) {
      // Update childColumn's width
      childColumn.width = newWidth;

      // Also update the width of all related cells within childColumn
      if (childColumn.tableHeader) {
        if (childColumn.tableHeader.element) {
          childColumn.tableHeader.element.width = newWidth;
        } else {
          childColumn.tableHeader.width = newWidth;
        }
      }
      if (childColumn.columnHeader) {
        if (childColumn.columnHeader.element) {
          childColumn.columnHeader.element.width = newWidth;
        } else {
          childColumn.columnHeader.width = newWidth;
        }
      }
      if (childColumn.detailCell) {
        if (childColumn.detailCell.element) {
          childColumn.detailCell.element.width = newWidth;
        } else {
          childColumn.detailCell.width = newWidth;
        }
      }
      if (childColumn.columnFooter) {
        if (childColumn.columnFooter.element) {
          childColumn.columnFooter.element.width = newWidth;
        } else {
          childColumn.columnFooter.width = newWidth;
        }
      }
      if (childColumn.tableFooter) {
        if (childColumn.tableFooter.element) {
          childColumn.tableFooter.element.width = newWidth;
        } else {
          childColumn.tableFooter.width = newWidth;
        }
      }
    }
  }

  // Recalculate the table's total width: the sum of all column widths
  if (
    currentElement.value &&
    currentElement.value.type === "table" &&
    currentElement.value.columns
  ) {
    const totalWidth = currentElement.value.columns.reduce(
      (sum: number, col: any) => sum + (col.width || 0),
      0,
    );
    currentElement.value.width = totalWidth;
  }
}

// Find the corresponding column in the children array (recursive search)
function findColumnInChildren(children: any[], targetColumn: any): any | null {
  for (const child of children) {
    if (child.uuid === targetColumn.uuid) {
      return child;
    }
    if (child.children) {
      const found = findColumnInChildren(child.children, targetColumn);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// Update the column name, also updating the corresponding column's name within children
function updateColumnName(column: any, index: number) {
  if (!column || !currentElement) return;

  const newName = column.name;

  // If the table has a children property, also update the corresponding column's name within children
  if (
    currentElement.value &&
    currentElement.value.type === "table" &&
    currentElement.value.children
  ) {
    // Find the corresponding column in children (by uuid or index)
    const childColumn = findColumnInChildren(
      currentElement.value.children,
      column,
    );
    if (childColumn) {
      // Update childColumn's name
      childColumn.name = newName;

      // If childColumn has a columnHeader, also update its text expression
      if (childColumn.columnHeader) {
        childColumn.columnHeader.expression = `"${newName}"`;
      }
    }
  }
}

// Update the table header text, also updating the corresponding column's table header text within children
function updateTableHeaderText(column: any, index: number) {
  if (
    !column ||
    !currentElement ||
    !column.hasTableHeader ||
    !column.tableHeader
  )
    return;

  const newText = column.tableHeader.expression || column.tableHeader.text || "";

  // If the table has a children property, also update the corresponding column's table header text within children
  if (
    currentElement.value &&
    currentElement.value.type === "table" &&
    currentElement.value.children
  ) {
    // Find the corresponding column in children (by uuid or index)
    const childColumn = findColumnInChildren(
      currentElement.value.children,
      column,
    );
    if (childColumn && childColumn.hasTableHeader && childColumn.tableHeader) {
      // Update childColumn's table header expression
      childColumn.tableHeader.expression = newText;
    }
  }
}

// Update the field expression, also updating the corresponding column's field expression within children
function updateFieldExpression(column: any, index: number) {
  if (!column || !currentElement || !column.detailCell) return;

  const newExpression = column.detailCell.expression;
  column.detailCell.expression = newExpression;

  // If the table has a children property, also update the corresponding column's field expression within children
  if (
    currentElement.value &&
    currentElement.value.type === "table" &&
    currentElement.value.children
  ) {
    // Find the corresponding column in children (by uuid or index)
    const childColumn = findColumnInChildren(
      currentElement.value.children,
      column,
    );
    if (childColumn && childColumn.detailCell) {
      childColumn.detailCell.expression = newExpression;
    }
  }
}

// Toggle whether the Table Header is included
function toggleTableHeader(column: any, event: Event) {
  const checkbox = event.target as HTMLInputElement;
  const hasTableHeader = checkbox.checked;

  if (!hasTableHeader) {
    // Clear the existing Table Header data
    delete column.tableHeader;
  } else {
    // Generate new default Table Header data
    if (!column.tableHeader) {
      column.tableHeader = {
        type: "textField",
        x: 0,
        y: 0,
        width: column.width,
        height: 30,
        expression: `"${column.name}"`,
        forecolor: "#000000",
        backcolor: "#FFFFFF",
        fontFamily: "SansSerif",
        fontSize: 19,
        isBold: true,
        textAlignment: "Center",
        verticalAlignment: "Middle",
      };
    }
  }

  emit("update-jrxml");
}

// Field selection modal related
const showFieldSelectionModal = ref(false);
const selectedFields = ref<string[]>([]);
const availableFields = computed(() => {
  if (
    !currentElement.value ||
    currentElement.value.type !== "table" ||
    !props.subDatasets
  )
    return [];

  const tableElement = currentElement.value as any;
  const datasetName = tableElement.dataset?.name;

  if (!datasetName) return [];

  // Find the matching dataset within subDatasets
  const matchingDataset = props.subDatasets.find(
    (dataset) => dataset.name === datasetName,
  );
  return matchingDataset?.fields || [];
});

// Computed property: get all combined columns, including child groups, returned as a flattened list
const allColumnGroups = computed(() => {
  if (
    !currentElement.value ||
    currentElement.value.type !== "table" ||
    !currentElement.value.children
  ) {
    return [];
  }
  return getAllColumnGroups(currentElement.value.children);
});

// Open the field selection modal
function openFieldSelectionModal() {
  if (!currentElement.value || currentElement.value.type !== "table") return;

  // Reset selected fields
  selectedFields.value = [];

  // Get current table columns
  const tableElement = currentElement.value as any;
  if (tableElement.columns) {
    // Extract field names from existing columns
    const usedFieldNames = tableElement.columns
      .map((column: any) => {
        if (column.detailCell?.expression) {
          // Match field expression pattern like $F{fieldName}
          const match = column.detailCell.expression.match(/\$F\{([^}]+)\}/);
          return match ? match[1] : null;
        }
        return null;
      })
      .filter((fieldName: string | null) => fieldName !== null);

    // Set selected fields to used field names
    selectedFields.value = usedFieldNames as string[];
  }

  showFieldSelectionModal.value = true;
}

// Toggle the field selection state
function toggleFieldSelection(fieldName: string) {
  const index = selectedFields.value.indexOf(fieldName);
  if (index === -1) {
    selectedFields.value.push(fieldName);
  } else {
    selectedFields.value.splice(index, 1);
  }
}

// Add the selected fields as columns
function addSelectedFieldsAsColumns() {
  if (!currentElement.value || currentElement.value.type !== "table") return;

  emit("save-state");

  const columnWidth = 160;
  const tableElement = currentElement.value as any;

  // Ensure columns array exists
  if (!tableElement.columns) {
    tableElement.columns = [];
  }

  // Get existing columns and their field names
  const existingColumns = [...tableElement.columns];
  const existingFieldMap = new Map<string, any>();

  // Populate existing field map
  existingColumns.forEach((column) => {
    if (column.detailCell?.element?.expression) {
      const match =
        column.detailCell.element.expression.match(/\$F\{([^}]+)\}/);
      if (match) {
        const fieldName = match[1];
        existingFieldMap.set(fieldName, column);
      }
    }
  });

  // Prepare new columns array
  const newColumns: any[] = [];

  // Add columns for selected fields
  selectedFields.value.forEach((fieldName) => {
    // Check if field already has a column
    if (existingFieldMap.has(fieldName)) {
      // Keep existing column
      newColumns.push(existingFieldMap.get(fieldName));
      // Remove from map to track which fields are still used
      existingFieldMap.delete(fieldName);
    } else {
      // Create new column for new field
      const newColumn: any = {
        uuid: crypto.randomUUID(),
        width: columnWidth,
        name: fieldName,
        hasTableHeader: false,
        tableHeader: {
          enable: false,
          element: {
            type: "textField",
            x: 0,
            y: 0,
            width: columnWidth,
            height: 30,
            expression: `"${fieldName}"`,
            forecolor: "#000000",
            backcolor: "#FFFFFF",
            fontFamily: "SansSerif",
            fontSize: 19,
            isBold: true,
          },
        },
        columnHeader: {
          enable: true,
          element: {
            type: "textField",
            x: 0,
            y: 0,
            width: columnWidth,
            height: 30,
            expression: `"${fieldName}"`,
          },
        },
        detailCell: {
          enable: true,
          element: {
            type: "textField",
            x: 0,
            y: 0,
            width: columnWidth,
            height: 30,
            expression: `$F{${fieldName}}`,
          },
        },
        columnFooter: {
          enable: false,
          element: {
            type: "textField",
            x: 0,
            y: 0,
            width: columnWidth,
            height: 30,
            expression: "",
          },
        },
        tableFooter: {
          enable: false,
          element: {
            type: "textField",
            x: 0,
            y: 0,
            width: columnWidth,
            height: 30,
            expression: "",
          },
        },
      };

      newColumns.push(newColumn);
    }
  });

  // Update table columns
  tableElement.columns = newColumns;

  showFieldSelectionModal.value = false;
  selectedFields.value = [];
  emit("update-jrxml");
}

// Table column operation methods
function addTableColumn() {
  if (!currentElement.value || currentElement.value.type !== "table") return;

  emit("save-state");

  const columnWidth = 160;
  const newColumn: any = {
    uuid: crypto.randomUUID(),
    width: columnWidth,
    name: `Column${currentElement.value.columns.length + 1}`,
    hasTableHeader: false,
    tableHeader: {
      enable: false,
      element: {
        type: "empty",
        x: 0,
        y: 0,
        width: columnWidth,
        height: 30,
      },
    },
    columnHeader: {
      enable: true,
      element: {
        type: "empty",
        x: 0,
        y: 0,
        width: columnWidth,
        height: 30,
      },
    },
    detailCell: {
      enable: true,
      element: {
        type: "empty",
        x: 0,
        y: 0,
        width: columnWidth,
        height: 30,
      },
    },
    tableFooter: {
      enable: false,
      element: {
        type: "empty",
        x: 0,
        y: 0,
        width: columnWidth,
        height: 30,
      },
    },
    columnFooter: {
      enable: false,
      element: {
        type: "empty",
        x: 0,
        y: 0,
        width: columnWidth,
        height: 30,
      },
    },
  };

  if (!currentElement.value.columns) {
    currentElement.value.columns = [];
  }

  currentElement.value.columns.push(newColumn);

  // Recalculate the table's total width: the sum of all column widths
  const totalWidth = currentElement.value.columns.reduce(
    (sum: number, col: any) => sum + (col.width || 0),
    0,
  );
  currentElement.value.width = totalWidth;

  emit("update-jrxml");
}

// Add a column group
function addColumnGroup() {
  if (
    !currentElement.value ||
    currentElement.value.type !== "table" ||
    !props.selectedElement
  )
    return;

  const { elementIndex, bandIndex, parentFrameIndex } = props.selectedElement;
  // Fix TypeScript error: use the correct argument format
  emit("add-columns-to-group", {
    elementIndex,
    columnIndices: [],
    bandIndex,
    parentFrameIndex,
  });
}

function removeTableColumn(index: number) {
  if (
    !currentElement.value ||
    currentElement.value.type !== "table" ||
    !currentElement.value.columns
  )
    return;

  if (currentElement.value.columns.length <= 1) {
    // Keep at least one column
    return;
  }

  emit("save-state");
  currentElement.value.columns.splice(index, 1);

  // Recalculate the table's total width: the sum of all column widths
  const totalWidth = currentElement.value.columns.reduce(
    (sum: number, col: any) => sum + (col.width || 0),
    0,
  );
  currentElement.value.width = totalWidth;

  emit("update-jrxml");
}

// Get all combined columns, including child groups, returned as a flattened list
function getAllColumnGroups(groups: any[]): any[] {
  const result: any[] = [];

  function traverse(group: any, path: number[] = []) {
    // Modify the original object directly, adding a path property
    group.path = path;
    result.push(group);
    if (group.children && group.children.length > 0) {
      group.children.forEach((child: any, index: number) => {
        traverse(child, [...path, index]);
      });
    }
  }

  groups.forEach((group) => traverse(group));
  return result;
}

// Compute the maximum allowed width for a combined column (the sum of the widths of all child columns and sub-groups)
function calculateMaxGroupWidth(groupInfo: any): number {
  // Recursively compute the sum of the widths of all leaf nodes (plain columns)
  function calculateLeafColumnsWidth(node: any): number {
    // If the node has children, recursively compute all child nodes
    if (node.children && node.children.length > 0) {
      return node.children.reduce((sum: number, child: any) => {
        return sum + calculateLeafColumnsWidth(child);
      }, 0);
    }
    // If the node has no children, it's a plain column, so return its width
    return node.width || 0;
  }

  return calculateLeafColumnsWidth(groupInfo);
}

// Delete element
function deleteElement() {
  emit("delete-element");
}

// Rectangle border related helper functions
function getRectangleBorderWidth(): number {
  const el = currentElement.value as any;
  if (!el?.pen) return el?.lineWidth !== undefined ? el.lineWidth : 1;
  return el.pen.lineWidth !== undefined ? el.pen.lineWidth : 1;
}

function setRectangleBorderWidth(value: string) {
  if (!currentElement.value) return;
  const el = currentElement.value as any;
  const numValue = parseFloat(value) || 0;
  emit("save-state");
  if (!el.pen) {
    el.pen = {};
  }
  el.pen.lineWidth = numValue;
  el.lineWidth = numValue;
  emit("update-jrxml");
}

function getRectangleBorderStyle(): string {
  const el = currentElement.value as any;
  if (!el?.pen) return el?.lineStyle || "Solid";
  return el.pen.lineStyle || el.lineStyle || "Solid";
}

function setRectangleBorderStyle(value: string) {
  if (!currentElement.value) return;
  const el = currentElement.value as any;
  emit("save-state");
  if (!el.pen) {
    el.pen = {};
  }
  el.pen.lineStyle = value;
  el.lineStyle = value;
  // Thicken a thin outline so the two lines of a double border are visible
  if (value === "Double" && getRectangleBorderWidth() < MIN_DOUBLE_LINE_WIDTH) {
    el.pen.lineWidth = MIN_DOUBLE_LINE_WIDTH;
    el.lineWidth = MIN_DOUBLE_LINE_WIDTH;
  }
  emit("update-jrxml");
}

function getRectangleBorderColor(): string {
  const el = currentElement.value as any;
  if (!el) return "#000000";
  return el.pen?.lineColor || el.lineColor || "#000000";
}

function setRectangleBorderColor(value: string) {
  if (!currentElement.value) return;
  const el = currentElement.value as any;
  emit("save-state");
  if (!el.pen) {
    el.pen = {};
  }
  el.pen.lineColor = value;
  el.lineColor = value;
  if (el.pen.lineWidth === undefined) {
    el.pen.lineWidth = 1;
  }
  el.lineWidth = el.pen.lineWidth;
  emit("update-jrxml");
}

// Get the style of the first cell of the given type found in the table
function getFirstTableCellStyle(
  cellType: "tableHeader" | "columnHeader" | "columnFooter" | "detailCell",
) {
  const tableElement = currentElement.value;
  if (!tableElement || tableElement.type !== "table")
    return {
      textAlignment: "Center",
      verticalAlignment: "Middle",
      fontSize: 12,
      isBold: false,
      isItalic: false,
      isUnderline: false,
      forecolor: "#000000",
      forecolorMode: "Opaque",
      backcolor: "#ffffff",
      mode: "Opaque",
    };

  // Recursive search function
  function findCellStyle(node: any): any {
    if (node[cellType]) {
      return node[cellType];
    }
    if (node.children) {
      for (const child of node.children) {
        const style = findCellStyle(child);
        if (style) {
          return style;
        }
      }
    }
    return null;
  }

  // First check the direct child columns
  if (tableElement.columns) {
    for (const column of tableElement.columns) {
      const style = findCellStyle(column);
      if (style) {
        return style;
      }
    }
  }

  // Then check the column groups
  if (tableElement.children) {
    for (const group of tableElement.children) {
      const style = findCellStyle(group);
      if (style) {
        return style;
      }
    }
  }

  // If no style was found, return the default style
  return {
    textAlignment: "Center",
    verticalAlignment: "Middle",
    fontSize: 12,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    forecolor: "#000000",
    forecolorMode: "Opaque",
    backcolor: "#ffffff",
    mode: "Opaque",
  };
}

// Update the style of all cells of the given type in the table
function updateAllTableCellStyles(
  cellType: "tableHeader" | "columnHeader" | "columnFooter" | "detailCell",
  style: any,
) {
  const tableElement = currentElement.value;
  if (!tableElement || tableElement.type !== "table") return;

  // Recursive update function
  function updateCellStyle(node: any) {
    if (node[cellType]) {
      // Deep-clone the style object to avoid reference issues
      node[cellType] = { ...style };
    }
    if (node.children) {
      for (const child of node.children) {
        updateCellStyle(child);
      }
    }
  }

  // Update all direct child columns
  if (tableElement.columns) {
    for (const column of tableElement.columns) {
      updateCellStyle(column);
    }
  }

  // Update all column groups
  if (tableElement.children) {
    for (const group of tableElement.children) {
      updateCellStyle(group);
    }
  }
}

// Update the style property of all cells in the table
function updateTableStyles() {
  const tableElement = currentElement.value;
  if (!tableElement || tableElement.type !== "table") return;

  // Recursive update function
  function updateCellStyle(node: any) {
    // Update the tableHeader style
    if (node.tableHeader) {
      node.tableHeader.style = tableStyles.value.tableHeader;
    }
    // Update the columnHeader style
    if (node.columnHeader) {
      node.columnHeader.style = tableStyles.value.columnHeader;
    }
    // Update the columnFooter style
    if (node.columnFooter) {
      node.columnFooter.style = tableStyles.value.columnFooter;
    }
    // Update the detailCell style
    if (node.detailCell) {
      node.detailCell.style = tableStyles.value.detailCell;
    }
    // Recursively update child nodes
    if (node.children) {
      for (const child of node.children) {
        updateCellStyle(child);
      }
    }
  }

  // Update all direct child columns
  if (tableElement.columns) {
    for (const column of tableElement.columns) {
      updateCellStyle(column);
    }
  }

  // Update all column groups
  if (tableElement.children) {
    for (const group of tableElement.children) {
      updateCellStyle(group);
    }
  }
}

function addProperty() {
  if (!currentElement.value) return;
  if (!currentElement.value.properties) {
    (currentElement.value as any).properties = [];
  }
  (currentElement.value as any).properties.push({ name: "", value: "" });
  emit("update-jrxml");
}

function addPropertyExpression() {
  if (!currentElement.value) return;
  if (!currentElement.value.propertyExpressions) {
    (currentElement.value as any).propertyExpressions = [];
  }
  (currentElement.value as any).propertyExpressions.push({
    name: "",
    valueExpression: "",
  });
  emit("update-jrxml");
}
</script>

<style scoped>
.element-properties {
  padding: var(--prop-spacing-md);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--prop-divider-color);
}

.element-properties .panel-header h3 {
  margin: 0;
  padding: 0;
  border: none;
  font-size: 15px;
  font-weight: 700;
  color: var(--prop-text-primary);
}

.section-title {
  font-size: 13px !important;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--prop-text-tertiary) !important;
}

/* Segmented tabs: same look as the controls inside the cards. The white
   highlight is one element moved by the open tab's index, so it slides. */
.prop-tab-bar {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--tab-count), minmax(0, 1fr));
  padding: 3px;
  border-radius: 9px;
  background: var(--prop-bg-tertiary, #eef0f4);
}

.prop-tab-indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / var(--tab-count));
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
  transform: translateX(calc(100% * var(--tab-index)));
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.prop-tab {
  position: relative;
  z-index: 1;
  min-width: 0;
  height: 30px;
  padding: 0 6px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--prop-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color 0.2s ease;
}

.prop-tab:hover {
  color: var(--prop-text-primary);
}

.prop-tab.active {
  font-weight: 600;
  color: var(--prop-primary-color, #1890ff);
}

.prop-tab:focus-visible {
  outline: 2px solid var(--prop-border-focus, #1890ff);
  outline-offset: 1px;
  border-radius: 7px;
}

.prop-tab-pane {
  padding-top: 14px;
}

/* The new tab's content fades and rises in */
.prop-tab-fade-enter-active,
.prop-tab-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.prop-tab-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.prop-tab-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .prop-tab-indicator,
  .prop-tab-fade-enter-active,
  .prop-tab-fade-leave-active {
    transition: none;
  }
}

.element-properties h4 {
  margin: 0 0 var(--prop-spacing-md) 0;
  padding: 0;
  font-size: var(--prop-font-size-md);
  font-weight: var(--prop-font-weight-semibold);
  color: var(--prop-text-primary);
}

.element-properties h5 {
  margin: 0 0 var(--prop-spacing-sm) 0;
  padding: 0;
  font-size: var(--prop-font-size-sm);
  font-weight: var(--prop-font-weight-semibold);
  color: var(--prop-text-secondary);
}

.property-section {
  margin-bottom: var(--prop-spacing-lg);
}

.form-group {
  margin-bottom: var(--prop-spacing-sm);
}

.form-group-row {
  display: flex;
  gap: var(--prop-spacing-sm);
  margin-bottom: var(--prop-spacing-sm);
}

.half-width {
  flex: 1;
}

.basic-properties-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--prop-spacing-md);
  margin-bottom: var(--prop-spacing-lg);
}

.basic-properties-grid .form-group {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: var(--prop-spacing-xs);
  font-size: var(--prop-font-size-sm);
  font-weight: var(--prop-font-weight-medium);
  color: var(--prop-text-secondary);
}

.form-group input:not([type="checkbox"]),
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  font-size: var(--prop-font-size-sm);
  box-sizing: border-box;
  transition:
    border-color var(--prop-transition-fast),
    box-shadow var(--prop-transition-fast);
}

.form-group input[type="checkbox"] {
  padding: 6px 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  font-size: var(--prop-font-size-sm);
  box-sizing: border-box;
}

.form-group input:hover,
.form-group select:hover,
.form-group textarea:hover {
  border-color: var(--prop-border-hover);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.form-group small {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: #999;
}

.band-settings-header-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.band-settings-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.band-settings-title-group h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--prop-text-primary);
  white-space: nowrap;
}

.template-scope-pill {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.1);
  font-size: 10px;
  font-weight: 600;
  color: var(--prop-primary-color, #1890ff);
  white-space: nowrap;
}

.reset-template-limits-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 999px;
  background: #fff;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.reset-template-limits-btn:hover {
  border-color: var(--prop-primary-color, #1890ff);
  color: var(--prop-primary-color, #1890ff);
}

.band-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* One card per band, with a coloured edge so the bands are easy to tell apart */
.template-band-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--prop-border-radius-md);
  background: var(--prop-bg-secondary);
  border-left: 3px solid var(--prop-primary-color, #1890ff);
  transition: background-color 0.15s ease;
}

.template-band-card:hover {
  background: #f3f6fa;
}

.template-band-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-band-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.band-badge-auto {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  font-size: 10px;
  font-weight: 600;
  color: #059669;
}

.band-limit-inputs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.band-limit-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.band-limit-input-group label {
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.input-unit-wrapper {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-unit-wrapper:hover {
  border-color: var(--prop-border-hover);
}

.input-unit-wrapper:focus-within {
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.input-unit-wrapper.is-disabled {
  background: var(--prop-bg-disabled);
  cursor: not-allowed;
}

.input-unit-wrapper input,
.form-group .input-unit-wrapper input {
  height: auto;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--prop-text-primary);
  outline: none;
  box-shadow: none;
}

.input-unit-wrapper input:disabled {
  cursor: not-allowed;
  color: var(--prop-text-tertiary);
}

.input-unit-wrapper .unit {
  margin-left: 4px;
  font-size: 11px;
  color: var(--prop-text-tertiary);
  user-select: none;
}

.box-section {
  margin-bottom: var(--prop-spacing-lg);
  padding: var(--prop-spacing-md);
  background-color: var(--prop-bg-secondary);
  border-radius: var(--prop-border-radius-md);
}

.box-section.compact {
  margin-bottom: var(--prop-spacing-md);
  padding: var(--prop-spacing-sm);
}

.border-quick-actions {
  display: flex;
  gap: var(--prop-spacing-sm);
}

.border-quick-actions.compact {
  gap: var(--prop-spacing-xs);
}

.border-group-row {
  display: flex;
  gap: var(--prop-spacing-md);
  flex-wrap: wrap;
  align-items: flex-start;
}

.border-group-item {
  flex: 1;
  min-width: 120px;
}

.border-sides-grid {
  display: grid;
  gap: 0;
}

/* ---------- Style Settings: shared field parts ---------- */
.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Number field with its unit inside */
.unit-input {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.unit-input input {
  width: 100%;
  height: 30px;
  padding: 0 22px 0 8px;
  -moz-appearance: textfield;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.unit-input input:focus,
.text-card select:focus {
  outline: none;
  border-color: var(--prop-border-focus, #1890ff);
  box-shadow: var(--prop-focus-ring);
}

/* No spinner arrows: they hide the number in narrow fields */
.unit-input input::-webkit-outer-spin-button,
.unit-input input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.unit-input > span {
  position: absolute;
  right: 8px;
  font-size: 11px;
  color: var(--prop-text-tertiary, #9ca3af);
  pointer-events: none;
}

.pen-swatch {
  display: inline-block;
  width: 28px;
  height: 0;
  border-top: 2px solid currentColor;
}

.pen-swatch.is-short,
.style-tile .pen-swatch {
  width: 18px;
}

.pen-swatch.is-dashed {
  border-top-style: dashed;
}

.pen-swatch.is-dotted {
  border-top-style: dotted;
}

.pen-swatch.is-double {
  border-top: 5px double currentColor;
}

/* ---------- Borders: one row per side ---------- */
.border-table {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 64px 34px;
  column-gap: 6px;
  column-gap: 8px;
  align-items: center;
}

.border-table-head,
.border-row {
  display: contents;
}

.border-table-head > span {
  padding-bottom: 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--prop-text-tertiary, #9ca3af);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.border-row > * {
  margin: 3px 0;
}

.border-row-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--prop-text-primary, #374151);
  white-space: nowrap;
}

/* "All" stands apart from the four sides below it */
.border-row.is-all > * {
  margin-bottom: 9px;
}

.border-row.is-all .border-row-label {
  font-weight: 700;
}

.line-style-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: var(--prop-bg-tertiary, #f3f4f6);
  min-width: 0;
}

.line-style-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 0;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--prop-text-tertiary, #9ca3af);
  cursor: pointer;
  transition: all 0.15s ease;
}

.line-style-btn:hover {
  color: var(--prop-text-primary, #111827);
}

.line-style-btn.active {
  background: #fff;
  color: var(--prop-border-focus, #1890ff);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
}

.line-style-btn:focus-visible,
.icon-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #1890ff);
  outline-offset: 1px;
}

.border-table-head > .line-style-names {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding: 0 2px 6px;
  overflow: visible;
}

.line-style-names > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  font-size: 9px;
  letter-spacing: 0.02em;
}

.border-table-head > span:last-child {
  overflow: visible;
  text-align: center;
}

.border-table-head > .line-style-names > span {
  letter-spacing: 0;
  text-overflow: clip;
}

.border-table .color-control.compact {
  width: 34px;
  height: 30px;
}

/* ---------- Corner radius and margins: fields around a preview ---------- */
.corner-designer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--prop-divider-color, #eee);
}

.pad-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.pad-title {
  margin: 0;
  padding: 0;
  border: none;
  font-size: var(--prop-font-size-sm);
  font-weight: 600;
  color: var(--prop-text-primary, #374151);
  white-space: nowrap;
}

/* "All corners" / "All sides": label beside its field */
.pad-all {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pad-all .field-label {
  margin: 0;
}

.pad-all .unit-input {
  width: 76px;
}

.pad-input {
  display: block;
  min-width: 0;
}

.corner-pad {
  display: grid;
  grid-template-columns: 76px 1fr 76px;
  grid-template-rows: auto auto;
  gap: 8px 12px;
  align-items: center;
}

.corner-input-topLeft { grid-column: 1; grid-row: 1; }
.corner-input-topRight { grid-column: 3; grid-row: 1; }
.corner-input-bottomLeft { grid-column: 1; grid-row: 2; }
.corner-input-bottomRight { grid-column: 3; grid-row: 2; }

.corner-preview {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: stretch;
  min-height: 70px;
  border: 2px solid var(--prop-border-focus, #1890ff);
  background: rgba(24, 144, 255, 0.06);
  transition: border-radius 0.2s ease;
}

.margin-pad {
  display: grid;
  grid-template-columns: 76px 1fr 76px;
  grid-template-rows: auto auto auto;
  gap: 8px 12px;
  align-items: center;
}

.margin-input-top { grid-column: 2; grid-row: 1; justify-self: center; width: 76px; }
.margin-input-left { grid-column: 1; grid-row: 2; }
.margin-input-right { grid-column: 3; grid-row: 2; }
.margin-input-bottom { grid-column: 2; grid-row: 3; justify-self: center; width: 76px; }

.margin-preview {
  grid-column: 2;
  grid-row: 2;
  position: relative;
  height: 56px;
  border: 2px solid var(--prop-border-color, #d1d5db);
  border-radius: 6px;
  background: #fff;
}

.margin-preview-content {
  position: absolute;
  border: 1.5px dashed var(--prop-border-focus, #1890ff);
  border-radius: 3px;
  background: rgba(24, 144, 255, 0.08);
  transition: all 0.2s ease;
}

/* ---------- Basic tab cards ---------- */
.geometry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
}

.style-ref-field {
  margin-top: 12px;
}

.card-select,
.card-textarea {
  width: 100%;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.card-select {
  height: 30px;
  padding: 0 8px;
}

.card-textarea {
  display: block;
  padding: 8px;
  resize: vertical;
  line-height: 1.45;
  white-space: pre-wrap;
}

.card-select:focus,
.card-textarea:focus {
  outline: none;
  border-color: var(--prop-border-focus, #1890ff);
  box-shadow: var(--prop-focus-ring);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.card-head h5 {
  margin: 0;
}

.insert-field {
  margin-top: 10px;
}

.card-input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  box-sizing: border-box;
}

.card-input:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.card-input.is-readonly {
  background: var(--prop-bg-disabled);
  color: var(--prop-text-secondary);
}

.card-hint {
  display: block;
  margin-top: 6px;
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.card-gap-sm {
  margin-top: 10px;
}

.card-input.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.toggle-row input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--prop-primary-color, #1890ff);
}

.image-name-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.image-name-row .card-input {
  flex: 1;
  min-width: 0;
}

.box-section .column-tree-toolbar {
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

/* Small pill action in a card header */
.chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid rgba(24, 144, 255, 0.35);
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.06);
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-border-focus, #1890ff);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.chip-btn:hover:not(:disabled) {
  background: var(--prop-border-focus, #1890ff);
  border-color: var(--prop-border-focus, #1890ff);
  color: #fff;
}

.chip-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.chip-btn-solid {
  background: var(--prop-border-focus, #1890ff);
  border-color: var(--prop-border-focus, #1890ff);
  color: #fff;
}

.chip-btn-solid:hover:not(:disabled) {
  background: var(--prop-primary-active, #096dd9);
}

.chip-btn-muted {
  border-color: var(--prop-border-color);
  background: #fff;
  color: var(--prop-text-secondary);
}

/* Full-width segmented control (rotation, line direction) */
.seg {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--prop-bg-tertiary, #f3f4f6);
}

.seg-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  height: 30px;
  padding: 0 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.seg-btn-stacked {
  flex-direction: column;
  gap: 2px;
  height: 46px;
}

.seg-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.seg-btn:hover {
  color: var(--prop-text-primary, #111827);
}

.seg-btn.active {
  background: #fff;
  color: var(--prop-border-focus, #1890ff);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
  font-weight: 600;
}

.seg-btn:focus-visible,
.chip-btn:focus-visible,
.ghost-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #1890ff);
  outline-offset: 1px;
}

.ghost-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 30px;
  margin-top: 10px;
  border: 1px dashed var(--prop-border-color, #d1d5db);
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ghost-btn:hover {
  border-color: var(--prop-border-focus, #1890ff);
  border-style: solid;
  color: var(--prop-border-focus, #1890ff);
  background: rgba(24, 144, 255, 0.05);
}

/* Line style names above an icon picker outside the border table */
.box-section > .line-style-names {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding: 0 2px 4px;
}

.box-section > .line-style-names-4,
.line-style-picker-4 {
  grid-template-columns: repeat(4, 1fr);
}

.box-section > .line-style-names > span {
  font-weight: 600;
  text-transform: uppercase;
  color: var(--prop-text-tertiary, #9ca3af);
}

/* Line style tiles: the line drawn above its name */
.style-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--prop-bg-tertiary, #eef0f4);
}

.style-tiles-4 {
  grid-template-columns: repeat(4, 1fr);
}

.style-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  height: 34px;
  padding: 0 2px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--prop-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.style-tile span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.style-tile:hover {
  color: var(--prop-text-primary);
}

.style-tile.active {
  background: #fff;
  color: var(--prop-primary-color, #1890ff);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
}

.style-tile:focus-visible {
  outline: 2px solid var(--prop-border-focus, #1890ff);
  outline-offset: 1px;
}

/* Width / colour (/ corner radius): equal columns, labels and fields aligned */
.value-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.value-row.has-three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.swatch-fill {
  display: block;
  width: 100%;
  height: 30px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
}

.card-gap {
  margin-top: 12px;
  align-items: flex-end;
}

.swatch-lg.color-control.compact {
  width: 44px;
  height: 30px;
}

/* ---------- Text card ---------- */
.text-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.text-card h5 {
  margin-bottom: 0;
}

.field-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.field {
  display: block;
  min-width: 0;
}

.field.grow {
  flex: 1 1 160px;
}

.font-size-field {
  flex: 0 0 84px;
}

.text-card select {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
}

.icon-segment {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: var(--prop-bg-tertiary, #f3f4f6);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  font-size: 13px;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  color: var(--prop-text-primary, #111827);
}

.icon-btn.active {
  background: #fff;
  color: var(--prop-border-focus, #1890ff);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
}

.icon-btn-isBold { font-weight: 800; }
.icon-btn-isItalic { font-style: italic; font-family: Georgia, serif; }
.icon-btn-isUnderline { text-decoration: underline; }

.corner-radius-hint {
  display: block;
  margin-top: 8px;
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.side-label {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--prop-font-size-sm);
  font-weight: var(--prop-font-weight-medium);
  color: var(--prop-text-secondary);
}

.side-control {
  flex: 1;
  min-width: 100px;
}

.side-control.compact {
  min-width: 80px;
  height: 24px;
  padding: 2px 6px;
  font-size: 11px;
}

.width-control {
  width: 80px;
}

.width-control.compact {
  width: 56px;
  height: 26px;
  padding: 2px 6px;
  font-size: 11px;
}

.color-control {
  width: 60px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  cursor: pointer;
}

.color-control.compact {
  width: 40px;
  height: 26px;
}

.form-group.compact {
  margin-bottom: var(--prop-spacing-sm);
}

.form-group.compact label {
  font-size: 11px;
  margin-bottom: 2px;
}

.form-group.compact input {
  height: 24px;
  padding: 2px 6px;
  font-size: 11px;
}

.small-input {
  width: 100%;
  height: 24px;
  padding: 2px 6px;
  font-size: 11px;
  box-sizing: border-box;
}

.padding-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--prop-spacing-sm);
}

.padding-grid.compact {
  gap: var(--prop-spacing-sm);
}

.border-quick-styles {
  margin-top: var(--prop-spacing-md);
  padding-top: var(--prop-spacing-md);
  border-top: 1px solid var(--prop-divider-color);
}

.border-quick-styles h6 {
  margin: 0 0 var(--prop-spacing-sm) 0;
  font-size: var(--prop-font-size-xs);
  font-weight: var(--prop-font-weight-semibold);
  color: var(--prop-text-secondary);
}

.quick-style-buttons {
  display: flex;
  gap: var(--prop-spacing-sm);
  flex-wrap: wrap;
}

.quick-style-buttons .n-button {
  margin: 0;
}

/* Adjust the radio button group's style to make it more compact */
:deep(.n-radio-group--button-type) {
  flex-wrap: wrap;
  gap: 4px;
}

:deep(.n-radio-button) {
  height: 24px;
  font-size: 11px;
  padding: 0 8px;
}

:deep(.n-radio-button__input) {
  margin: 0;
}

.checkbox-group {
  display: flex;
  gap: var(--prop-spacing-lg);
  margin-bottom: var(--prop-spacing-lg);
}

.checkbox-group.compact {
  gap: var(--prop-spacing-sm);
  margin-bottom: var(--prop-spacing-sm);
  flex-wrap: wrap;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: var(--prop-spacing-xs);
  font-size: var(--prop-font-size-sm);
  cursor: pointer;
}

.alignment-controls.compact {
  margin-bottom: 0;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
}

.alignment-controls {
  display: flex;
  gap: var(--prop-spacing-xs);
  margin-bottom: var(--prop-spacing-sm);
}

.element-actions {
  margin-top: var(--prop-spacing-lg);
  padding-top: var(--prop-spacing-md);
  border-top: 1px solid var(--prop-divider-color);
}

.delete-element-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 34px;
  border: 1px solid rgba(220, 38, 38, 0.35);
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.15s ease;
}

.delete-element-btn:hover {
  border-color: #dc2626;
  background: #dc2626;
  color: #fff;
}

.delete-element-btn:focus-visible {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
}

.font-hint {
  display: block;
  margin-top: var(--prop-spacing-xs);
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

/* Table properties styles */
.table-column-actions {
  display: flex;
  gap: var(--prop-spacing-xs);
  margin-bottom: var(--prop-spacing-sm);
}

.form-group.small {
  flex: 1;
  min-width: 80px;
  margin-bottom: var(--prop-spacing-xs);
}

.form-group.small.full-width {
  width: 100%;
  flex-basis: 100%;
  margin-top: 2px;
}

.form-group.small label {
  margin-bottom: 1px;
  font-size: var(--prop-font-size-xs);
}

.small-input {
  width: 100%;
  padding: 2px 6px;
  font-size: var(--prop-font-size-xs);
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-sm);
  transition:
    border-color var(--prop-transition-fast),
    box-shadow var(--prop-transition-fast);
}

.small-input:hover {
  border-color: var(--prop-border-hover);
}

.small-input:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.text-style-controls,
.border-controls {
  display: flex;
  gap: var(--prop-spacing-xs);
  flex-wrap: wrap;
}

.color-picker {
  height: 18px;
  padding: 0;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-sm);
  cursor: pointer;
}

.field-selection-content {
  display: flex;
  gap: var(--prop-spacing-xl);
  height: 400px;
}

.available-fields,
.selected-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.inline-checkbox {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.inline-checkbox input {
  margin-right: 5px;
}

.inline-input {
  display: flex;
  align-items: center;
  margin-top: 5px;
}

.inline-input label {
  margin-right: 5px;
  min-width: 70px;
}

.available-fields h4,
.selected-fields h4 {
  margin-top: 0;
  margin-bottom: var(--prop-spacing-md);
  font-size: var(--prop-font-size-md);
  font-weight: var(--prop-font-weight-semibold);
  color: var(--prop-text-secondary);
}

.fields-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  background-color: var(--prop-bg-secondary);
  padding: var(--prop-spacing-sm);
}

.field-item {
  display: flex;
  align-items: center;
  padding: var(--prop-spacing-sm) var(--prop-spacing-md);
  margin-bottom: var(--prop-spacing-xs);
  background-color: var(--prop-bg-primary);
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  cursor: pointer;
  transition: all var(--prop-transition-fast);
}

.field-item:hover {
  background-color: var(--prop-bg-tertiary);
  border-color: var(--prop-primary-color);
}

.field-item.selected {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

.field-item input[type="checkbox"] {
  margin-right: var(--prop-spacing-sm);
}

/* Invalid width style */
.invalid-width {
  border-color: var(--prop-danger-color) !important;
  background-color: #fff0f0;
}

/* Read-only input style */
.readonly-input {
  display: block;
  padding: 2px 6px;
  font-size: var(--prop-font-size-xs);
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-sm);
  background-color: var(--prop-bg-disabled);
  color: var(--prop-text-secondary);
  cursor: default;
}

/* Read-only inputs placed inside a .form-group (e.g. the image name) need to win
   over the default .form-group input styling */
.form-group input.readonly-input {
  background-color: var(--prop-bg-disabled);
  color: var(--prop-text-secondary);
  cursor: default;
}

.form-group input.readonly-input:focus,
.form-group input.readonly-input:hover {
  border-color: var(--prop-border-color);
  background-color: var(--prop-bg-disabled);
  box-shadow: none;
}

/* Width hint style */
.width-hint {
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
  margin-top: 2px;
}

.field-name {
  flex: 1;
  font-size: var(--prop-font-size-sm);
  font-weight: var(--prop-font-weight-medium);
}

.field-type {
  font-size: 11px;
  color: var(--prop-text-tertiary);
  margin-left: var(--prop-spacing-sm);
}

/* Combined column style */
.table-column-groups {
  margin-top: var(--prop-spacing-md);
  background-color: var(--prop-bg-secondary);
  border-radius: var(--prop-border-radius-md);
  padding: var(--prop-spacing-md);
  border: 1px solid var(--prop-border-color);
}

.column-group-item {
  margin-bottom: 15px;
  background-color: var(--prop-bg-primary);
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  overflow: hidden;
  box-shadow: var(--prop-shadow-sm);
}

.column-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--prop-spacing-md);
  background-color: var(--prop-bg-tertiary);
  border-bottom: 1px solid var(--prop-border-color);
  font-weight: var(--prop-font-weight-semibold);
  color: var(--prop-text-primary);
}

.column-group-name {
  font-size: var(--prop-font-size-md);
  display: flex;
  align-items: center;
  gap: var(--prop-spacing-sm);
}

.group-path {
  font-size: var(--prop-font-size-sm);
  color: var(--prop-text-secondary);
  font-weight: normal;
  background-color: #e6f0fa;
  padding: 2px 6px;
  border-radius: 10px;
}

.column-group-properties {
  padding: var(--prop-spacing-md);
}

.group-action-buttons {
  display: flex;
  gap: var(--prop-spacing-xs);
}

.table-style-settings {
  display: flex;
  flex-direction: column;
  gap: var(--prop-spacing-lg);
}

.table-style-section {
  margin-bottom: var(--prop-spacing-md);
}

.table-style-section h6 {
  margin-bottom: var(--prop-spacing-sm);
  font-size: var(--prop-font-size-sm);
  font-weight: var(--prop-font-weight-medium);
  color: var(--prop-text-primary);
}

/* Style management section */
.style-management-section {
  margin-bottom: var(--prop-spacing-lg);
}

.style-manager-content {
  max-height: 500px;
  overflow-y: auto;
}

.style-item {
  margin-bottom: var(--prop-spacing-xl);
  padding: var(--prop-spacing-lg);
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  background-color: var(--prop-bg-secondary);
}

.style-item h4 {
  margin-top: 0;
  margin-bottom: var(--prop-spacing-md);
  font-size: var(--prop-font-size-md);
  font-weight: var(--prop-font-weight-semibold);
  color: var(--prop-text-primary);
  border-bottom: 1px solid var(--prop-border-color);
  padding-bottom: var(--prop-spacing-sm);
}

.style-properties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--prop-spacing-lg);
}

.btn-autofit-height {
  padding: 2px 7px;
  font-size: 11px;
  background-color: #f0f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-autofit-height:hover {
  background-color: #1890ff;
  color: #ffffff;
  border-color: #1890ff;
}

.rotation-segmented-group,
.line-orientation-group {
  display: flex;
  gap: 4px;
  background-color: var(--prop-bg-secondary, #f5f5f5);
  padding: 3px;
  border-radius: 4px;
  border: 1px solid var(--prop-border-color, #e8e8e8);
}

.rotation-btn,
.line-orientation-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 4px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: var(--prop-text-secondary, #595959);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.rotation-btn:hover,
.line-orientation-btn:hover {
  color: var(--prop-text-primary, #262626);
  background-color: rgba(255, 255, 255, 0.6);
}

.rotation-btn.active,
.line-orientation-btn.active {
  background-color: #ffffff;
  color: #1890ff;
  border-color: #1890ff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-weight: 600;
}

.btn-cross-line {
  margin-top: 6px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  border: 1px dashed #1890ff;
  background-color: #f0f7ff;
  color: #1890ff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cross-line:hover {
  background-color: #1890ff;
  color: #ffffff;
}

@media (max-width: 768px) {
  .style-properties {
    grid-template-columns: 1fr;
  }
}
</style>
