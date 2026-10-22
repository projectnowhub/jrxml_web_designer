<template>
  <div ref="panelRoot" class="element-properties">
    <!-- Panel header: what the panel is showing (the selected element, or the report) -->
    <div class="panel-header">
      <h3>{{ panelTitle }}</h3>
      <!-- Template Settings: say they change only the open template -->
      <span
        v-if="!selectedElement || !currentElement"
        class="template-scope-pill"
        :title="t('templateSettings.scopeHint')"
      >
        <Info :size="12" :stroke-width="2.25" aria-hidden="true" />
        {{ t("templateSettings.scope") }}
      </span>
    </div>
    <!-- What it is and what to do with it (Help) -->
    <PanelTip :kind="panelKind" />

    <!-- Template Settings: nothing selected, so the settings of this report
         (paper, margins, font, the parts of each page, their heights).
         What new reports start with is Default Settings (bottom panel). -->
    <div v-if="!selectedElement || !currentElement" class="property-section">
      <!-- Resets only ever take Default Settings, never the original ones -->
      <div class="template-reset-row">
        <button type="button" class="template-reset-btn" @click="resetAllToDefault">
          <RotateCcw :size="12" :stroke-width="2.2" aria-hidden="true" />
          {{ t("templateSettings.resetAll") }}
        </button>
      </div>
      <div class="template-setup">
        <PageSetupSection
          v-for="card in TEMPLATE_CARDS"
          :key="card.section"
          :section="card.section"
          :title="t(card.title)"
          :help-id="card.help"
          :value="templateSetup"
          :bands-hint="t('templateSettings.bandsHint')"
          @change="changeTemplate"
        >
          <template #actions>
            <button type="button" class="template-reset-btn" @click="useDefault(card.section)">
              <RotateCcw :size="11" :stroke-width="2.2" aria-hidden="true" />
              {{ t("templateSettings.useDefault") }}
            </button>
          </template>
        </PageSetupSection>
      </div>

      <!-- Section Heights: one card, like the others -->
      <div class="heights-card">
        <div class="band-settings-header-wrapper">
          <div class="band-settings-title-group">
            <h5>{{ t("properties.templateBandSettings") }}<SettingHelpButton id="reportSections" /></h5>
          </div>
          <button
            type="button"
            class="template-reset-btn"
            :title="t('templateSettings.useDefaultHeightsTitle')"
            @click="useDefaultHeights"
          >
            <RotateCcw :size="11" :stroke-width="2.2" aria-hidden="true" />
            {{ t("templateSettings.useDefault") }}
          </button>
        </div>
        <SettingHelpText id="reportSections" />
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
                  <input v-live-change
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
                    <input v-live-change
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
                    <input v-live-change
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

      <!-- Style Settings: take every style off this element (content, place and size stay) -->
      <div v-if="activeTab === 'style'" class="reset-style-row">
        <button type="button" class="chip-btn" :title="t('resetStyle.hint')" @click="resetStyle">
          <RotateCcw :size="13" aria-hidden="true" />
          {{ t("resetStyle.label") }}
        </button>
      </div>

      <Transition name="prop-tab-fade" mode="out-in">
        <!-- Basic properties tab -->
        <div v-if="activeTab === 'basic'" key="basic" class="prop-tab-pane" role="tabpanel">
          <!-- Table: where its content comes from (one Table element, two kinds) -->
          <div v-if="isTableElement" class="box-section compact">
            <h5>{{ t("customTable.content") }}<SettingHelpButton id="tableContent" /></h5>
            <SettingHelpText id="tableContent" />
            <div class="seg" role="radiogroup" :aria-label="t('customTable.content')">
              <button
                v-for="kind in TABLE_CONTENT_KINDS"
                :key="kind.value"
                type="button"
                role="radio"
                class="seg-btn"
                :class="{ active: tableContentKind === kind.value }"
                :aria-checked="tableContentKind === kind.value"
                @click="tableContentKind !== kind.value && emit('table-content', kind.value)"
              >
                <component :is="kind.icon" :size="14" aria-hidden="true" />
                <span>{{ t(kind.labelKey) }}</span>
              </button>
            </div>
            <small class="card-hint">{{ t(tableContentKind === "typed" ? "customTable.typedHint" : "customTable.fromDataHint") }}</small>
          </div>

          <div class="box-section compact">
            <h5>{{ t("properties.positionSize") }}<SettingHelpButton id="positionSize" /></h5>
            <SettingHelpText id="positionSize" />
            <div class="geometry-grid">
              <label v-for="dim in GEOMETRY_FIELDS" :key="dim" class="field">
                <span class="field-label">{{ t(`properties.${dim}`) }}</span>
                <span class="unit-input">
                  <input v-live-change
                    :value="currentElement[dim]"
                    type="number"
                    @change="setIntegerValue(currentElement, dim, $event)"
                  />
                  <span>px</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Custom table: grid size and the look of the chosen cells -->
          <!-- Contents list: fill from the headings, its rows -->
          <ContentsListProperties
            v-if="currentElement.type === 'contentsList'"
            part="basic"
            :element="currentElement as ContentsListElement"
            @fill="emit('fill-contents-list')"
          />

          <!-- Section Heading (or one of its parts): its number -->
          <HeadingNumberProperties v-if="sectionHeading" :heading="sectionHeading" />

          <!-- Location (or its map / address): the place, map, layout and lines -->
          <LocationProperties v-if="locationBox" :key="locationBox.uuid" :box="locationBox" />

          <CustomTableProperties
            v-if="currentElement.type === 'customTable'"
            part="basic"
            :element="currentElement as CustomTableElement"
          />
          <!-- Its table style: the same styles as a data table -->
          <TableDataPanel
            v-if="currentElement.type === 'customTable'"
            part="basic"
            v-bind="tablePanelProps"
            v-on="tablePanelEvents"
          />

          <!-- Table: data, style, row sizes -->
          <TableDataPanel
            v-if="currentElement.type === 'table'"
            part="basic"
            v-bind="tablePanelProps"
            v-on="tablePanelEvents"
          />

          <!-- Frame properties: border presets, border lines, layout -->
          <FrameProperties
            v-if="currentElement && currentElement.type === 'frame'"
            :element="currentElement"
            :is-page-border="isPageBorder"
            @update:element="replaceCurrentElement"
          />

          <!-- Image properties -->
          <template v-if="currentElement && currentElement.type === 'image'">
            <!-- A Location's map is drawn from its place: no picture to upload -->
            <div v-if="!isLocationPart(currentElement)" class="box-section compact">
              <h5>{{ t("properties.imageName") }}<SettingHelpButton id="picture" /></h5>
              <SettingHelpText id="picture" />
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
            <!-- Shape: preset corner looks, cards like the box border presets
                 (custom corners are in Style Settings) -->
            <div class="box-section compact">
              <div class="shape-card-head">
                <h5>{{ t("properties.imageShape") }}<SettingHelpButton id="imageShape" /></h5>
                <span v-if="!currentImageShape" class="shape-custom-badge">{{ t("properties.imageShapeCustom") }}</span>
              </div>
              <SettingHelpText id="imageShape" />
              <span class="field-label shape-field-label">{{ t("properties.imageShapePresets") }}</span>
              <div class="shape-grid" role="radiogroup" :aria-label="t('properties.imageShapePresets')">
                <button
                  v-for="shape in IMAGE_SHAPES"
                  :key="shape.id"
                  type="button"
                  role="radio"
                  class="shape-swatch"
                  :class="{ active: currentImageShape === shape.id }"
                  :aria-checked="currentImageShape === shape.id"
                  :title="t(`properties.imageShapes.${shape.id}Title`)"
                  @click="applyImageShape(shape.id)"
                >
                  <span class="shape-sample-wrap">
                    <span class="shape-sample" :style="shapePreviewStyle(shape)" aria-hidden="true"></span>
                  </span>
                  <span class="shape-name">{{ t(`properties.imageShapes.${shape.id}`) }}</span>
                </button>
              </div>
              <small class="card-hint">{{ t("properties.imageShapeHint") }}</small>
            </div>
            <div class="box-section compact">
              <h5>{{ t("properties.rotation") }}<SettingHelpButton id="rotation" /></h5>
              <SettingHelpText id="rotation" />
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

          <!-- Chart: type, title, legend -->
          <ChartProperties
            v-if="currentElement.type === 'chart'"
            part="basic"
            :element="currentElement as ChartElement"
            @configure="emit('configure-chart')"
          />

          <!-- Barcode: type (with samples) and value -->
          <BarcodeProperties
            v-if="currentElement.type === 'barcode'"
            :element="currentElement as BarcodeElement"
          />

          <!-- QR codes aren't turned (JasperReports has no orientation for them) -->
          <template v-if="currentElement.type === 'barcode' && currentElement.barcodeType !== 'QRCode'">
            <div class="box-section compact">
              <h5>{{ t("properties.rotation") }}<SettingHelpButton id="rotation" /></h5>
              <SettingHelpText id="rotation" />
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

          <!-- Circle: traffic-light colours for status columns (Low / Moderate / High risk) -->
          <div v-if="currentElement.type === 'ellipse'" class="box-section compact">
            <h5>{{ t("reportParts.statusColor") }}<SettingHelpButton id="statusColor" /></h5>
            <SettingHelpText id="statusColor" />
            <div class="seg" role="radiogroup" :aria-label="t('reportParts.statusColor')">
              <button
                v-for="status in STATUS_COLORS"
                :key="status.id"
                type="button"
                role="radio"
                class="seg-btn"
                :class="{ active: isStatusColor(status.color) }"
                :aria-checked="isStatusColor(status.color)"
                @click="setStatusColor(status.color)"
              >
                <span class="status-swatch" :style="{ background: status.color }" aria-hidden="true" />
                <span>{{ t(`reportParts.placeholder.${status.id}Risk`) }}</span>
              </button>
            </div>
          </div>

          <!-- Line: which way it runs (its look is in Style Settings) -->
          <template v-if="currentElement && currentElement.type === 'line'">
            <div class="box-section compact">
              <h5>{{ t("properties.lineOrientation") }}<SettingHelpButton id="lineOrientation" /></h5>
              <SettingHelpText id="lineOrientation" />
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
            />
            <!-- Date: which date and how it looks instead of free text -->
            <DateProperties
              v-else-if="isDateElement(currentElement)"
              :element="currentElement"
            />
            <!-- A Location's address is written from its place -->
            <div v-else-if="!isLocationPart(currentElement)" class="box-section compact">
              <div class="card-head">
                <h5>{{ t("properties.textContent") }}<SettingHelpButton id="textContent" /></h5>
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
              <SettingHelpText id="textContent" />
              <textarea
                class="card-textarea"
                :value="getTextFieldDisplay(currentElement)"
                @focus="textRecorded = false"
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
              <h5>{{ t("properties.rotation") }}<SettingHelpButton id="rotation" /></h5>
              <SettingHelpText id="rotation" />
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


        <!-- Custom table: lines, text size, space in the cells -->
        <div
          v-else-if="activeTab === 'style' && currentElement.type === 'contentsList'"
          key="contents-list-style"
          class="prop-tab-pane"
          role="tabpanel"
        >
          <ContentsListProperties part="style" :element="currentElement as ContentsListElement" />
        </div>

        <div
          v-else-if="activeTab === 'style' && currentElement.type === 'customTable'"
          key="custom-table-style"
          class="prop-tab-pane"
          role="tabpanel"
        >
          <TableDataPanel part="style" v-bind="tablePanelProps" v-on="tablePanelEvents" />
          <CustomTableProperties part="style" :element="currentElement as CustomTableElement" />
        </div>

        <!-- Table: Style Settings is where its look is changed -->
        <div
          v-else-if="activeTab === 'style' && currentElement.type === 'table'"
          key="table-style"
          class="prop-tab-pane"
          role="tabpanel"
        >
          <TableDataPanel part="style" v-bind="tablePanelProps" v-on="tablePanelEvents" />
        </div>

        <!-- Style settings tab -->
        <div v-else key="style" class="prop-tab-pane" role="tabpanel">

            <ChartProperties
              v-if="currentElement.type === 'chart'"
              part="style"
              :element="currentElement as ChartElement"
            />

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
                  <h5>{{ t("properties.outline") }}<SettingHelpButton id="outline" /></h5>
                  <SettingHelpText id="outline" />
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
                        <input v-live-change
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
                        <input v-live-change
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
                  <h5>{{ t("properties.sideBorders") }}<SettingHelpButton id="sideBorders" /></h5>
                  <SettingHelpText id="sideBorders" />
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
                          <input v-live-change
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
                          <input v-live-change
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
                    <h5 class="pad-title">{{ t("properties.marginSettings") }}<SettingHelpButton id="innerSpace" /></h5>
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
                  <SettingHelpText id="innerSpace" />
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
              <h5>{{ t("properties.lineSettings") }}<SettingHelpButton id="lineSettings" /></h5>
              <SettingHelpText id="lineSettings" />
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
                    <input v-live-change
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
              <h5>{{ t("properties.textSettings") }}<SettingHelpButton id="textSettings" /></h5>
              <SettingHelpText id="textSettings" />
              <div v-if="showFontName" class="field-row">
                <label class="field grow">
                  <span class="field-label">{{ t("properties.fontName") }}</span>
                  <!-- Read-only until the report server supports more fonts -->
                  <select
                    :value="resolveReportFont(currentElement.fontFamily)"
                    :disabled="availableFonts.length <= 1"
                    @change="setTextProperty('fontFamily', ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="font in availableFonts" :key="font" :value="font">{{ font }}</option>
                  </select>
                </label>
                <label class="field font-size-field">
                  <span class="field-label">{{ t("properties.fontSize") }}</span>
                  <span class="unit-input">
                    <input v-live-change
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
              <p v-if="showFontName && availableFonts.length <= 1" class="font-info">
                <Info :size="13" :stroke-width="2" />
                <span>{{ t("properties.fontLimitedInfo", { font: DEFAULT_REPORT_FONT }) }}</span>
              </p>

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
              <h5>{{ t("properties.backgroundColor") }}<SettingHelpButton id="background" /></h5>
              <SettingHelpText id="background" />
              <ColorPickerWithOpacity
                :model-value="currentElement.backcolor"
                :mode="currentElement.mode"
                @update:model-value="setColorProperty('backcolor', 'backcolor', $event)"
                @update:mode="setColorProperty('backcolor', 'mode', $event)"
              />
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

</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSelectionStore } from "@/stores/selection";
import { useReportStore } from "@/stores/report";
import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Ban,
  Database,
  FileText,
  PencilLine,
  Minus,
  Plus,
  RotateCcw,
  Scan,
  Slash,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Trash2,
  Info,
  Upload,
  X,
} from "@lucide/vue";
import { DEFAULT_REPORT_FONT, resolveReportFont } from "../../../config/fonts.config";
import ColorSwatchPicker from '../../common/ColorSwatchPicker.vue';
import { computed, ref, onMounted, onUpdated, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { NButton, NRadioGroup, NRadioButton } from "naive-ui";
import notification from "@/utils/notification";
import type { Band, BarcodeElement, ChartElement, ContentsListElement, CustomTableElement, FrameElement, SelectedElementInfo } from "../../../types";
import type { SavedTableStyle } from "@/types/dataSource";
import { getAvailableFonts } from "../../../utils/fontUtils";
import {
  CORNER_NAMES,
  getElementTypeName,
  getImageDisplayName,
  getPropertyCornerRadii,
  getImageShape,
  IMAGE_SHAPES,
  type ImageShapeId,
  setImageShape,
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
import ColorPickerWithOpacity from "./ColorPickerWithOpacity.vue";
import PaginationProperties from "./PaginationProperties.vue";
import DateProperties from "./DateProperties.vue";
import ChartProperties from "./ChartProperties.vue";
import CustomTableProperties from "./CustomTableProperties.vue";
import ContentsListProperties from "./ContentsListProperties.vue";
import HeadingNumberProperties from "./HeadingNumberProperties.vue";
import LocationProperties from "./LocationProperties.vue";
import { isLocationElement, isLocationPart } from "../../../utils/location/locationElement";
import PanelTip from "../../help/PanelTip.vue";
import SettingHelpButton from "../../help/SettingHelpButton.vue";
import SettingHelpText from "../../help/SettingHelpText.vue";
import PageSetupSection, { type PageSetupValue } from "../PageSetupSection.vue";
import { loadReportDefaults } from "@/utils/reportDefaults";
import { cardsWithoutHelp } from "@/utils/helpCoverage";
import { cleanLegacyAutoDateElement, resolveLegacyDateSample } from "@/utils/autoDate";
import { hasProperty, SECTION_HEADING_PROPERTY, SUB_HEADING_PROPERTY } from "@/utils/contentsList";
import { resetElementStyle } from "../../../utils/resetStyle";
import BarcodeProperties from "./BarcodeProperties.vue";
import { isPagination } from "../../../utils/paginationPresets";
import { isDateElement } from "../../../utils/dateElement";
import FrameProperties from "./FrameProperties.vue";
import {
  getBoxCornerRadii,
  setBoxCornerRadii,
  clampRectInBox,
  isBoxPart,
  isUniformBorder,
} from "../../../utils/framePresets";
import { STATUS_COLORS } from "../../../utils/reportParts";
import TableDataPanel from "./TableDataPanel.vue";
import { useLivePreview } from "@/composables/useLivePreview";
import SwitchControl from "./common/SwitchControl.vue";

const { t } = useI18n();

interface Props {
  // Table styles saved in the report
}

interface Emits {
  (e: "update:bands", bands: Band[]): void;
  (e: "delete-element"): void;
  // Fit the selected text element's box to its text (done by the designer)
  (e: "fit-to-text"): void;
  (e: "save-table-style", name: string): void;
  (e: "update-table-style", id: string): void;
  (e: "rename-table-style", id: string, name: string): void;
  (e: "delete-table-style", id: string): void;
  // Open the Configure popup for the selected table
  (e: "configure-table"): void;
  (e: "table-content", kind: "data" | "typed"): void;
  (e: "fill-contents-list"): void;
  (e: "configure-chart"): void;
  // Paper or margins changed: the designer fits the page's content to it
  (e: "page-setup-change"): void;
}

const props = defineProps<Props>();
// Changes: an undo step before, the JRXML rewritten after
const report = useReportStore();

// Report, selection and editor state come from the stores
const selectionStore = useSelectionStore();
const { selectedBandIndex, selectedElement } = storeToRefs(selectionStore);
const reportStore = useReportStore();
const { bands, reportProperties, tableStyles, reportFields, reportParameters, reportVariables } = storeToRefs(reportStore);

const emit = defineEmits<Emits>();

function getBandLimit(bandType: string) {
  if (!reportProperties.value) return { min: 20, max: 70 };
  if (!reportProperties.value.bandLimits) {
    reportProperties.value.bandLimits = getEffectiveDefaultBandLimits();
  }
  if (!reportProperties.value.bandLimits[bandType]) {
    reportProperties.value.bandLimits[bandType] = { min: 20, max: 70 };
  }
  return reportProperties.value.bandLimits[bandType];
}

function getMaxPhysicalHeight(bandType: string): number {
  const pageH = reportProperties.value?.pageHeight || 842;
  const topM = reportProperties.value?.topMargin || 20;
  const bottomM = reportProperties.value?.bottomMargin || 20;
  const printableH = pageH - topM - bottomM;
  let otherBandsH = 0;
  if (bands.value && Array.isArray(bands.value)) {
    bands.value.forEach((b) => {
      if (b.type !== bandType && b.type !== "detail" && b.type !== "background") {
        otherBandsH += b.height || 0;
      }
    });
  }
  // Leave at least 20px for detail band
  return Math.max(20, printableH - otherBandsH - 20);
}

function getMaxAllowedLimit(bandType: string): number {
  const pageH = reportProperties.value?.pageHeight || 842;
  const topM = reportProperties.value?.topMargin || 20;
  const bottomM = reportProperties.value?.bottomMargin || 20;
  const printableH = pageH - topM - bottomM;
  let otherBandsMin = 0;
  if (bands.value && Array.isArray(bands.value)) {
    bands.value.forEach((b) => {
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
  const band = bands.value?.find((b) => b.type === bandType);
  if (band && typeof band.height === "number" && band.height < limit.min) {
    band.height = limit.min;
  }
  report.updateJrxml();
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
  const band = bands.value?.find((b) => b.type === bandType);
  if (band && typeof band.height === "number" && band.height > limit.max) {
    band.height = limit.max;
  }
  report.updateJrxml();
}

// Section Heights → Use default: the heights and limits of Default Settings
function useDefaultHeights() {
  resetTemplateBandLimitsToDefault();
  notification.success(t("templateSettings.useDefaultDone"));
}

function resetTemplateBandLimitsToDefault(record = true) {
  if (!reportProperties.value) return;
  if (record) report.saveStateToHistory();
  const config = getEffectiveDefaultBandConfig();
  const limits: Record<string, { min: number; max: number }> = {};
  for (const key of Object.keys(config)) {
    const item = config[key];
    if (item) {
      limits[key] = { min: item.min, max: item.max };
    }
  }
  reportProperties.value.bandLimits = limits;

  if (bands.value && Array.isArray(bands.value)) {
    bands.value.forEach((band, index) => {
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
  if (selectedElement.value && bands.value && Array.isArray(bands.value)) {
    const band = bands.value[selectedElement.value.bandIndex];
    if (band && band.elements && Array.isArray(band.elements)) {
      // Check whether this is an element nested inside a Frame
      if (selectedElement.value.parentFrameIndex !== undefined) {
        const frame = band.elements[selectedElement.value.parentFrameIndex];
        if (frame && frame.type === "frame" && frame.elements) {
          return frame.elements[selectedElement.value.elementIndex];
        }
      } else {
        return band.elements[selectedElement.value.elementIndex];
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
  return !["image", "line", "rectangle", "ellipse", "frame", "barcode", "chart", "customTable", "contentsList"].includes(currentElement.value.type);
});

// Frame in the Background band: a border drawn on every page, with no fill or padding
// The Section Heading box selected, or the one holding the selected part
const sectionHeading = computed<FrameElement | null>(() => {
  const sel = selectedElement.value;
  if (!sel) return null;
  const band = bands.value?.[sel.bandIndex];
  const box = sel.parentFrameIndex !== undefined ? band?.elements[sel.parentFrameIndex] : currentElement.value;
  return box?.type === "frame" && hasProperty(box, SECTION_HEADING_PROPERTY) ? (box as FrameElement) : null;
});

// The Location shown when it, its map or its address is selected
const locationBox = computed<FrameElement | null>(() => {
  const sel = selectedElement.value;
  if (!sel) return null;
  const box = sel.parentFrameIndex !== undefined ? bands.value?.[sel.bandIndex]?.elements[sel.parentFrameIndex] : currentElement.value;
  return isLocationElement(box) ? (box as FrameElement) : null;
});

const isPageBorder = computed(
  () =>
    currentElement.value?.type === "frame" &&
    !!selectedElement.value &&
    selectedElement.value.parentFrameIndex === undefined &&
    bands.value[selectedElement.value.bandIndex]?.type === "background",
);

const showBackgroundColor = computed(() => {
  if (!currentElement.value || isPageBorder.value) return false;
  return !["line", "barcode", "customTable", "contentsList"].includes(currentElement.value.type);
});

const showFontName = computed(() => {
  if (!currentElement.value) return false;
  return !["line", "image", "frame", "rectangle", "ellipse", "barcode", "table", "chart", "customTable", "contentsList"].includes(currentElement.value.type);
});

const showTextAlignmentAndStyle = computed(() => {
  if (!currentElement.value) return false;
  return !["line", "image", "frame", "rectangle", "ellipse", "barcode", "chart", "table", "customTable", "contentsList"].includes(currentElement.value.type);
});

// Style management modal control

// Frame property update handler
const handleFramePropertyUpdate = (updatedElement: any) => {
  if (currentElement.value && selectedElement.value) {
    const band = bands.value[selectedElement.value.bandIndex];
    if (band && band.elements) {
      if (selectedElement.value.parentFrameIndex !== undefined) {
        const frame = band.elements[selectedElement.value.parentFrameIndex];
        if (frame && frame.type === "frame" && frame.elements) {
          frame.elements[selectedElement.value.elementIndex] = updatedElement;
        }
      } else {
        band.elements[selectedElement.value.elementIndex] = updatedElement;
      }
      emit("update:bands", bands.value);
      report.updateJrxml();
    }
  }
};

// Replace the selected element with an updated copy (frame panel edits:
// border presets, layout), recorded for undo first
const replaceCurrentElement = (updatedElement: any) => {
  report.saveStateToHistory();
  handleFramePropertyUpdate(updatedElement);
};

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
  const band = bands.value[index];
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
  const detailBand = bands.value.find((b) => b.type === "detail");
  if (detailBand) {
    const pageH = reportProperties.value?.pageHeight || 842;
    const topM = reportProperties.value?.topMargin || 20;
    const bottomM = reportProperties.value?.bottomMargin || 20;
    const availableH = pageH - topM - bottomM;
    let otherBandsH = 0;
    bands.value.forEach((b) => {
      if (b.type !== "detail" && b.type !== "background") {
        otherBandsH += b.height || 0;
      }
    });
    detailBand.height = Math.max(20, availableH - otherBandsH);
  }

  // Callers take the undo snapshot before changing the height
  const updatedBands = [...bands.value];
  emit("update:bands", updatedBands);
  report.updateJrxml();
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
  report.saveStateToHistory();
  target[property] = parsed;
  // A ready-made box's own part keeps inside the box when its position or size is typed
  const parentIndex = selectedElement.value?.parentFrameIndex;
  if (
    parentIndex !== undefined &&
    target === currentElement.value &&
    isBoxPart(target) &&
    ["x", "y", "width", "height"].includes(property)
  ) {
    const box = bands.value[selectedElement.value!.bandIndex]?.elements[parentIndex];
    if (box?.type === "frame") Object.assign(target, clampRectInBox(target, box));
  }
  input.value = String(target[property]);
  report.updateJrxml();
  return true;
}

// Set horizontal alignment
function setHorizontalAlignment(alignment: "Left" | "Center" | "Right") {
  if (currentElement.value) {
    report.saveStateToHistory();
    currentElement.value.textAlignment = alignment;
    report.updateJrxml();
  }
}

// Set vertical alignment
function setVerticalAlignment(alignment: "Top" | "Middle" | "Bottom") {
  if (currentElement.value) {
    report.saveStateToHistory();
    currentElement.value.verticalAlignment = alignment;
    report.updateJrxml();
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

  report.saveStateToHistory();
  currentElement.value.expression = newExpression;

  report.updateJrxml();
}

// Get clean text field content for display (strips quotes if static text, preserves field expressions)
function getTextFieldDisplay(element: any) {
  if (!element) return "";
  const raw = element.expression || (element.fieldName ? `$F{${element.fieldName}}` : "");
  const trimmed = String(raw).trim();
  if (trimmed.includes("SimpleDateFormat") && trimmed.includes("java.util.Date")) {
    return resolveLegacyDateSample(trimmed);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/\\n/g, '\n');
  }
  return trimmed.replace(/\\n/g, '\n');
}

// Update text field content (wraps static text in quotes, preserves $F{...} / $V{...} expressions)
// Typing in the Text box is one undo step per visit to it, not one per key
const textRecorded = ref(false);
function updateTextFieldDisplay(val: string) {
  if (!currentElement.value || currentElement.value.type !== "textField") return;
  if (!textRecorded.value) {
    report.saveStateToHistory();
    textRecorded.value = true;
  }
  cleanLegacyAutoDateElement(currentElement.value);
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
  report.updateJrxml();
}

// Insert a selected field into the text field
function insertFieldIntoTextField(fieldExpr: string) {
  if (!fieldExpr || !currentElement.value || currentElement.value.type !== "textField") return;
  report.saveStateToHistory();
  currentElement.value.expression = fieldExpr;
  report.updateJrxml();
}

// Set rotation for text, image, and barcode elements
function setElementRotation(rot: "None" | "Right" | "UpsideDown" | "Left") {
  if (!currentElement.value) return;
  report.saveStateToHistory();
  (currentElement.value as any).rotation = rot;
  report.updateJrxml();
}

// Image shape: the preset in use, "square" for plain corners, null for custom corners
const currentImageShape = computed<ImageShapeId | null>(() => {
  const element = currentElement.value;
  if (element?.type !== "image") return null;
  const shape = getImageShape(element);
  if (shape) return shape;
  const radii = getPropertyCornerRadii(element);
  return CORNER_NAMES.every((c) => radii[c] === 0) ? "square" : null;
});

// One undo step. The image keeps its position and size: only its corners change.
function applyImageShape(id: ImageShapeId) {
  const element = currentElement.value as any;
  if (!element || element.type !== "image") return;
  if (currentImageShape.value === id) return;
  report.saveStateToHistory();
  setImageShape(element, id);
  report.updateJrxml();
}

// Card sample: a small picture cut to the shape (wide for the pill)
function shapePreviewStyle(shape: (typeof IMAGE_SHAPES)[number]) {
  const width = shape.id === "pill" ? 46 : 30;
  const height = shape.id === "pill" ? 22 : 30;
  const side = Math.min(width, height);
  return {
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: shape.corners.map((c) => `${Math.round(side * c)}px`).join(" "),
  };
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
  report.saveStateToHistory();
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
  report.updateJrxml();
}

// Add a crossing line element to form an "X"
function addCrossingLine() {
  if (
    !currentElement.value ||
    currentElement.value.type !== "line" ||
    !selectedElement.value ||
    !bands.value
  )
    return;
  report.saveStateToHistory();
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

  const band = bands.value[selectedElement.value.bandIndex];
  if (band && band.elements) {
    if (selectedElement.value.parentFrameIndex !== undefined) {
      const frame = band.elements[selectedElement.value.parentFrameIndex];
      if (frame && frame.type === "frame" && frame.elements) {
        frame.elements.push(crossLine);
      }
    } else {
      band.elements.push(crossLine);
    }
  }
  report.updateJrxml();
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
    report.saveStateToHistory();
    (element as any).imageExpression = toImageExpression(source);
    // Use the uploaded file name as the image name shown in the panels
    setImageName(element, file.name || "");
    // A crop belongs to the previous picture
    setImageCrop(element, null);
    report.updateJrxml();
  } catch (error) {
    console.error("Image upload failed:", error);
    notification.error(
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
  if (!selectedElement.value || !el) return t("properties.reportProperties");
  if (isPagination(el)) return t("elementNames.pageNumber");
  if (isDateElement(el)) return t("elementNames.dateTime");
  if (isLocationElement(el)) return t("elementNames.location");
  if (isPageBorder.value) return t("elementNames.framePageBorder");
  // Headings are shown by their own name, not as the box / text they are built of
  if (hasProperty(el, SECTION_HEADING_PROPERTY)) return t("elementNames.partSectionHeading");
  if (hasProperty(el, SUB_HEADING_PROPERTY)) return t("elementNames.partSubHeading");
  return t(getElementTypeName(el.type));
});

// Development: a settings card without its (i) explanation is named in the console
const panelRoot = ref<HTMLElement | null>(null);
if (import.meta.env.DEV) {
  const warned = new Set<string>();
  const checkCardHelp = () => {
    if (!panelRoot.value) return;
    for (const title of cardsWithoutHelp(panelRoot.value)) {
      if (warned.has(title)) continue;
      warned.add(title);
      console.warn(`[help] The settings card "${title}" has no explanation: add SettingHelpButton / SettingHelpText (utils/helpDocs.ts).`);
    }
  };
  onMounted(checkCardHelp);
  onUpdated(checkCardHelp);
}

// Template Settings (nothing selected): this report's page setup, one undo
// step per change; paper or margins refit the page's content
const TEMPLATE_CARDS = [
  { section: "paper", title: "templateSettings.paper", help: "templatePaper" },
  { section: "margins", title: "bottomPanel.pageMargins", help: "templateMargins" },
  { section: "font", title: "templateSettings.font", help: "templateFont" },
  { section: "bands", title: "bottomPanel.bandSelection", help: "templateBands" },
] as const;

const templateSetup = computed<PageSetupValue>(() => {
  const page = reportProperties.value;
  return {
    pageWidth: page.pageWidth,
    pageHeight: page.pageHeight,
    leftMargin: page.leftMargin,
    rightMargin: page.rightMargin,
    topMargin: page.topMargin,
    bottomMargin: page.bottomMargin,
    font: { ...page.defaultFont },
    bandTypes: report.bandTypes,
  };
});

const PAGE_KEYS = ["pageWidth", "pageHeight", "leftMargin", "rightMargin", "topMargin", "bottomMargin"] as const;

// One card from Default Settings (never the original settings)
type SetupSection = (typeof TEMPLATE_CARDS)[number]["section"];
function defaultsFor(section: SetupSection): Partial<PageSetupValue> {
  const defaults = loadReportDefaults();
  if (section === "paper") return { pageWidth: defaults.pageWidth, pageHeight: defaults.pageHeight };
  if (section === "margins") {
    const { leftMargin, rightMargin, topMargin, bottomMargin } = defaults;
    return { leftMargin, rightMargin, topMargin, bottomMargin };
  }
  if (section === "font") return { font: { ...defaults.font } };
  return { bandTypes: defaults.bandTypes };
}

function useDefault(section: SetupSection) {
  changeTemplate(defaultsFor(section));
  notification.success(t("templateSettings.useDefaultDone"));
}

// Every card and the section heights from Default Settings: one undo step
function resetAllToDefault() {
  const defaults = loadReportDefaults();
  report.saveStateToHistory();
  const page = reportProperties.value;
  for (const key of PAGE_KEYS) page[key] = defaults[key];
  page.defaultFont = { ...defaults.font };
  report.setBandTypes(defaults.bandTypes, { record: false });
  resetTemplateBandLimitsToDefault(false);
  emit("page-setup-change");
  notification.success(t("templateSettings.resetAllDone"));
}
function changeTemplate(patch: Partial<PageSetupValue>) {
  if (patch.bandTypes) {
    report.setBandTypes(patch.bandTypes);
    return;
  }
  report.saveStateToHistory();
  const page = reportProperties.value;
  if (patch.font) page.defaultFont = { ...patch.font };
  const pageChanged = PAGE_KEYS.some((key) => patch[key] !== undefined);
  for (const key of PAGE_KEYS) {
    const value = patch[key];
    if (value !== undefined) page[key] = value;
  }
  if (pageChanged) emit("page-setup-change");
  else report.updateJrxml();
}

// The kind of thing shown, for its one-line tip (help.panelTips.<kind>)
const panelKind = computed(() => {
  const el = currentElement.value as any;
  if (!selectedElement.value || !el) return "report";
  if (isPagination(el)) return "pageNumber";
  if (isDateElement(el)) return "dateTime";
  if (isLocationElement(el)) return "location";
  if (isPageBorder.value) return "pageBorder";
  if (hasProperty(el, SECTION_HEADING_PROPERTY)) return "sectionHeading";
  if (hasProperty(el, SUB_HEADING_PROPERTY)) return "subHeading";
  return el.type as string;
});

// Element tabs. The open tab is kept when another element is selected, unless
// that element doesn't have it (e.g. Table Properties): then Basic opens, instead
// of an empty panel.
const activeTab = ref("basic");
const TAB_LABELS: Record<string, string> = {
  basic: "properties.basicProperties",
  style: "properties.styleSettings",
};
const availableTabs = computed(() => ["basic", "style"]);

// "Reset style": one undo step
function resetStyle() {
  const element = currentElement.value;
  if (!element) return;
  report.saveStateToHistory();
  resetElementStyle(element, {
    fontSize: reportProperties.value?.defaultFont?.size,
    isPageBorder: isPageBorder.value,
  });
  report.updateJrxml();
}

// One Table element: its content comes from project data, or is typed by the user
const TABLE_CONTENT_KINDS = [
  { value: "data", labelKey: "customTable.fromData", icon: Database },
  { value: "typed", labelKey: "customTable.typed", icon: PencilLine },
] as const;
const isTableElement = computed(() => ["table", "customTable"].includes(currentElement.value?.type ?? ""));
const tableContentKind = computed(() => (currentElement.value?.type === "customTable" ? "typed" : "data"));

// The table panel appears in both tabs (Basic: data, style, row sizes;
// Style Settings: changes to its look)
const tablePanelProps = computed(() => ({ element: currentElement.value as any, tableStyles: tableStyles.value ?? [] }));
const tablePanelEvents = {
  configure: () => emit("configure-table"),
  "save-table-style": (name: string) => emit("save-table-style", name),
  "update-table-style": (id: string) => emit("update-table-style", id),
  "rename-table-style": (id: string, name: string) => emit("rename-table-style", id, name),
  "delete-table-style": (id: string) => emit("delete-table-style", id),
  "open-style-settings": () => (activeTab.value = "style"),
};
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
  report.saveStateToHistory();
  element[key] = value;
  report.updateJrxml();
}

function setFontSize(value: string) {
  const size = Math.round(parseFloat(value));
  setTextProperty("fontSize", Number.isFinite(size) && size > 0 ? size : undefined);
}

// Colour pickers send the colour and then the mode (and repeat while the
// opacity slider moves): these share one undo step per colour
// Status dot: fill with one of the traffic-light colours (an outline of width 0
// follows the fill, so the dot stays one colour)
const isStatusColor = (color: string) =>
  currentElement.value?.mode === "Opaque" &&
  currentElement.value?.backcolor?.toUpperCase() === color;
function setStatusColor(color: string) {
  const element = currentElement.value as any;
  if (!element || isStatusColor(color)) return;
  report.saveStateToHistory();
  element.mode = "Opaque";
  element.backcolor = color;
  if (element.pen && !element.pen.lineWidth) element.pen = { ...element.pen, lineColor: color };
  report.updateJrxml();
}

function setColorProperty(group: string, key: string, value: unknown) {
  const element = currentElement.value as any;
  if (!element || element[key] === value) return;
  recordBorderEdit(`color-${group}`);
  element[key] = value;
  report.updateJrxml();
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
  report.saveStateToHistory();
  if (element.type === "frame") setBoxCornerRadii(element, next);
  else setPropertyCornerRadii(element, next);
  report.updateJrxml();
}

// Undo step for a border edit. Repeated edits of the same control in quick
// succession (typing a width, dragging the colour picker) share one step.
let lastBorderEdit = { key: "", time: 0 };
function recordBorderEdit(key: string) {
  const now = Date.now();
  if (key !== lastBorderEdit.key || now - lastBorderEdit.time > 1000) {
    report.saveStateToHistory();
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
  report.updateJrxml();
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

  report.updateJrxml();
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
  report.updateJrxml();
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
  report.updateJrxml();
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
  report.updateJrxml();
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
  report.updateJrxml();
}

// Handle Global Margin input: sets all four sides and global padding
function handleGlobalMarginInput(event: Event) {
  if (!currentElement.value) return;
  if (!currentElement.value.box) {
    currentElement.value.box = {};
  }
  const input = event.target as HTMLInputElement;
  const rawVal = input.value;
  report.saveStateToHistory();

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
  report.updateJrxml();
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
  report.saveStateToHistory();

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

  report.updateJrxml();
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
  report.saveStateToHistory();
  if (!el.pen) {
    el.pen = {};
  }
  el.pen.lineWidth = numValue;
  el.lineWidth = numValue;
  report.updateJrxml();
}

function getRectangleBorderStyle(): string {
  const el = currentElement.value as any;
  if (!el?.pen) return el?.lineStyle || "Solid";
  return el.pen.lineStyle || el.lineStyle || "Solid";
}

function setRectangleBorderStyle(value: string) {
  if (!currentElement.value) return;
  const el = currentElement.value as any;
  report.saveStateToHistory();
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
  report.updateJrxml();
}

function getRectangleBorderColor(): string {
  const el = currentElement.value as any;
  if (!el) return "#000000";
  return el.pen?.lineColor || el.lineColor || "#000000";
}

function setRectangleBorderColor(value: string) {
  if (!currentElement.value) return;
  const el = currentElement.value as any;
  report.saveStateToHistory();
  if (!el.pen) {
    el.pen = {};
  }
  el.pen.lineColor = value;
  el.lineColor = value;
  if (el.pen.lineWidth === undefined) {
    el.pen.lineWidth = 1;
  }
  el.lineWidth = el.pen.lineWidth;
  report.updateJrxml();
}

function addProperty() {
  if (!currentElement.value) return;
  if (!currentElement.value.properties) {
    (currentElement.value as any).properties = [];
  }
  (currentElement.value as any).properties.push({ name: "", value: "" });
  report.updateJrxml();
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
  report.updateJrxml();
}
</script>

<style scoped>
.element-properties {
  padding: 12px;
  background: #fcfcfe;
  min-height: 100%;
  box-sizing: border-box;
}

.template-reset-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

/* Use default / Reset all to default: a small pill */
.template-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid #e6e5ee;
  border-radius: 999px;
  background: #ffffff;
  color: #45425a;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.template-reset-btn:hover {
  border-color: rgba(124, 92, 247, 0.55);
  background: rgba(124, 92, 247, 0.06);
  color: #6440f4;
}

.template-setup {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(28, 27, 38, 0.07);
}

.element-properties .panel-header h3 {
  margin: 0;
  padding: 0;
  border: none;
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: #1c1b26;
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
  background: #f1f0f6;
  border: 1px solid rgba(28, 27, 38, 0.05);
}

.prop-tab-indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / var(--tab-count));
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.08);
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
  font-weight: 650;
  color: #5b3ee0;
}

.prop-tab:focus-visible {
  outline: 2px solid var(--prop-border-focus, #7c5cf7);
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
  font-weight: 650;
  color: #1c1b26;
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

.band-settings-title-group h5 {
  display: flex;
  align-items: center;
  margin: 0;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

/* Section Heights: a card like Paper, Margins… with a light block per section */
.heights-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.heights-card .band-settings-header-wrapper {
  margin-bottom: 0;
}

.heights-card .template-band-card {
  padding: 9px 10px;
  border-color: #eeedf4;
  background: #fafafd;
  box-shadow: none;
}

.template-scope-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: help;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.18);
  font-size: 10px;
  font-weight: 700;
  color: #6366f1;
  white-space: nowrap;
}

.reset-template-limits-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 999px;
  background: #fff;
  font-size: 11px;
  font-weight: 600;
  color: var(--prop-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.reset-template-limits-btn:hover {
  border-color: rgba(124, 92, 247, 0.35);
  background: rgba(124, 92, 247, 0.06);
  color: #5b3ee0;
}

.band-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Clean modern card per band matching Home page cards */
.template-band-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 12px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(28, 27, 38, 0.08);
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.template-band-card:hover {
  border-color: rgba(124, 92, 247, 0.35);
  box-shadow: 0 6px 16px rgba(124, 92, 247, 0.08);
}

.template-band-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-band-title {
  font-size: 12.5px;
  font-weight: 650;
  color: #1c1b26;
}

.band-badge-auto {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  font-size: 10px;
  font-weight: 650;
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
  border: 1px solid rgba(28, 27, 38, 0.11);
  border-radius: 7px;
  background: #fafafc;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.input-unit-wrapper:hover {
  border-color: rgba(124, 92, 247, 0.35);
  background: #ffffff;
}

.input-unit-wrapper:focus-within {
  border-color: var(--prop-border-focus);
  background: #ffffff;
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
  margin-bottom: 12px;
  padding: 12px;
  background-color: #ffffff;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.box-section.compact {
  margin-bottom: 10px;
  padding: 10px 12px;
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
  border-color: var(--prop-border-focus, #6440f4);
  box-shadow: var(--prop-focus-ring);
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
  grid-template-columns: 46px minmax(0, 1fr) 72px 34px;
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
  color: var(--prop-border-focus, #6440f4);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
}

.line-style-btn:focus-visible,
.icon-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #6440f4);
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
  width: 84px;
}

.pad-input {
  display: block;
  min-width: 0;
}

.corner-pad {
  display: grid;
  grid-template-columns: 84px 1fr 84px;
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
  border: 2px solid var(--prop-border-focus, #6440f4);
  background: rgba(100, 64, 244, 0.06);
  transition: border-radius 0.2s ease;
}

.margin-pad {
  display: grid;
  grid-template-columns: 84px 1fr 84px;
  grid-template-rows: auto auto auto;
  gap: 8px 12px;
  align-items: center;
}

.margin-input-top { grid-column: 2; grid-row: 1; justify-self: center; width: 84px; }
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
  border: 1.5px dashed var(--prop-border-focus, #6440f4);
  border-radius: 3px;
  background: rgba(100, 64, 244, 0.08);
  transition: all 0.2s ease;
}

/* ---------- Basic tab cards ---------- */
.geometry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
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
  border-color: var(--prop-border-focus, #6440f4);
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
  accent-color: var(--prop-primary-color, #6440f4);
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
.reset-style-row {
  display: flex;
  justify-content: flex-end;
  margin: 8px;
}

.chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid rgba(100, 64, 244, 0.35);
  border-radius: 999px;
  background: rgba(100, 64, 244, 0.06);
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-border-focus, #6440f4);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.chip-btn:hover:not(:disabled) {
  background: var(--prop-border-focus, #6440f4);
  border-color: var(--prop-border-focus, #6440f4);
  color: #fff;
}

.chip-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.chip-btn-solid {
  background: var(--prop-border-focus, #6440f4);
  border-color: var(--prop-border-focus, #6440f4);
  color: #fff;
}

.chip-btn-solid:hover:not(:disabled) {
  background: var(--prop-primary-active, #5b3ee0);
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

.status-swatch {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
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
  color: var(--prop-border-focus, #6440f4);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
  font-weight: 600;
}

.seg-btn:focus-visible,
.chip-btn:focus-visible,
.ghost-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #6440f4);
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
  border-color: var(--prop-border-focus, #6440f4);
  border-style: solid;
  color: var(--prop-border-focus, #6440f4);
  background: rgba(100, 64, 244, 0.05);
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

/* Image shape cards, styled like the box border presets (FrameProperties.vue) */
.shape-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.shape-card-head h5 {
  margin: 0;
}

.shape-custom-badge {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(100, 64, 244, 0.1);
  font-size: 10px;
  font-weight: 600;
  color: var(--prop-border-focus, #6440f4);
}

.shape-field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary, #6b7280);
}

.shape-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;
}

.shape-swatch {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-width: 0;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.shape-swatch:hover {
  border-color: var(--prop-border-hover, #9ca3af);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.shape-swatch.active {
  border-color: var(--prop-border-focus, #6440f4);
  box-shadow: 0 0 0 2px rgba(100, 64, 244, 0.2);
}

.shape-swatch:focus-visible {
  outline: none;
  border-color: var(--prop-border-focus, #6440f4);
  box-shadow: var(--prop-focus-ring);
}

/* Small "page" the picture sits on */
.shape-sample-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: 5px;
  background: var(--prop-bg-tertiary, #f3f4f6);
}

.shape-swatch.active .shape-sample-wrap {
  background: rgba(100, 64, 244, 0.08);
}

/* A tiny landscape photo (sun and hills, plain CSS) cut to the shape */
.shape-sample {
  display: block;
  flex-shrink: 0;
  background:
    radial-gradient(circle at 72% 30%, #fde68a 0 11%, transparent 12%),
    radial-gradient(ellipse 70% 50% at 25% 100%, #1e40af 0 98%, transparent 100%),
    radial-gradient(ellipse 80% 42% at 85% 100%, #6440f4 0 98%, transparent 100%),
    linear-gradient(160deg, #c4b5fd, #60a5fa);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
}

.shape-name {
  font-size: 11px;
  line-height: 1.2;
  color: var(--prop-text-secondary, #6b7280);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shape-swatch.active .shape-name {
  color: var(--prop-border-focus, #6440f4);
  font-weight: 600;
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
  color: var(--prop-primary-color, #6440f4);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
}

.style-tile:focus-visible {
  outline: 2px solid var(--prop-border-focus, #6440f4);
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

.font-info {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: #6b7280;
}

.font-info svg {
  flex-shrink: 0;
  margin-top: 1px;
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
  color: var(--prop-border-focus, #6440f4);
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
  background-color: #f1edff;
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

.btn-autofit-height {
  padding: 2px 7px;
  font-size: 11px;
  background-color: #f0f7ff;
  color: #6440f4;
  border: 1px solid #91d5ff;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-autofit-height:hover {
  background-color: #6440f4;
  color: #ffffff;
  border-color: #6440f4;
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
  color: #6440f4;
  border-color: #6440f4;
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
  border: 1px dashed #6440f4;
  background-color: #f0f7ff;
  color: #6440f4;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cross-line:hover {
  background-color: #6440f4;
  color: #ffffff;
}
</style>
