<template>
    <div class="element-properties">
        <h3>{{ t("properties.title") }}</h3>

        <!-- Style management button -->
        <div class="style-management-section">
            <n-button type="primary" @click="showStyleManagerModal = true">
                {{ t("properties.styleManagement") }}
            </n-button>
        </div>

        <!-- Report properties -->
        <div
            v-if="!selectedBandIndex && !selectedElement"
            class="property-section"
        >
            <h4>{{ t("properties.reportProperties") }}</h4>

            <!-- Band height settings -->
            <div class="form-group">
                <h4>{{ t("properties.bandHeightSettings") }}</h4>
                <div class="band-heights-grid">
                    <div
                        v-for="(band, index) in bands"
                        :key="index"
                        class="band-height-item"
                    >
                        <label>{{ getBandDisplayName(band.type) }}</label>
                        <div class="band-height-control">
                            <input
                                v-model.number="band.height"
                                type="number"
                                min="0"
                                step="1"
                                class="band-height-input"
                                @change="
                                    ensureIntegerValue(band, 'height');
                                    updateBandHeight(index);
                                "
                                @blur="
                                    ensureIntegerValue(band, 'height');
                                    updateBandHeight(index);
                                "
                            />
                            <span class="band-height-unit">px</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Element properties -->
        <div
            v-else-if="selectedElement && currentElement"
            class="property-section"
        >
            <!-- Element properties tabs -->
            <n-tabs type="segment">
                <!-- Basic properties tab -->
                <n-tab-pane name="basic" :tab="t('properties.basicProperties')">
                    <h4>{{ t("properties.basicProperties") }}</h4>
                    <div class="basic-properties-grid">
                        <div class="form-group">
                            <label>{{ t("properties.x") }}</label>
                            <input
                                v-if="currentElement"
                                v-model.number="currentElement.x"
                                type="number"
                                @change="
                                    ensureIntegerValue(currentElement, 'x')
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>{{ t("properties.y") }}</label>
                            <input
                                v-if="currentElement"
                                v-model.number="currentElement.y"
                                type="number"
                                @change="
                                    ensureIntegerValue(currentElement, 'y')
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>{{ t("properties.width") }}</label>
                            <input
                                v-if="currentElement"
                                v-model.number="currentElement.width"
                                type="number"
                                @change="
                                    ensureIntegerValue(currentElement, 'width')
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>{{ t("properties.height") }}</label>
                            <input
                                v-if="currentElement"
                                v-model.number="currentElement.height"
                                type="number"
                                @change="
                                    ensureIntegerValue(currentElement, 'height')
                                "
                            />
                        </div>
                    </div>

                    <!-- Common print-when expression (all element types except break and table) -->
                    <div
                        class="form-group"
                        v-if="
                            currentElement &&
                            currentElement.type !== 'break' &&
                            currentElement.type !== 'table'
                        "
                    >
                        <label>{{
                            t("properties.printWhenExpression") ||
                            "Print When Expression"
                        }}</label>
                        <ExpressionEditor
                            :model-value="
                                currentElement.printWhenExpression || ''
                            "
                            @update:model-value="
                                currentElement.printWhenExpression = $event
                            "
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>

                    <!-- Style reference -->
                    <div
                        class="form-group"
                        v-if="reportStyles && reportStyles.length > 0"
                    >
                        <label>{{
                            t("properties.styleReference") || "Style Reference"
                        }}</label>
                        <select
                            v-model="currentElement.style"
                            class="form-select"
                        >
                            <option value="">
                                {{ t("properties.noStyle") || "No Style" }}
                            </option>
                            <option
                                v-for="s in reportStyles"
                                :key="s.name"
                                :value="s.name"
                            >
                                {{ s.name }}
                            </option>
                        </select>
                    </div>

                    <!-- Show specific properties based on element type -->
                    <template v-if="currentElement.type === 'staticText'">
                        <div class="form-group">
                            <label>{{ t("properties.textContent") }}</label>
                            <textarea
                                v-if="currentElement"
                                v-model="currentElement.text"
                            ></textarea>
                        </div>
                        <div class="form-group">
                            <label>Text Adjust</label>
                            <select v-model="currentElement.textAdjust">
                                <option value="">Default</option>
                                <option value="StretchHeight">StretchHeight - Stretch Height</option>
                                <option value="CutText">CutText - Cut Text</option>
                                <option value="ShrinkToFit">ShrinkToFit - Shrink to Fit</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Rotation</label>
                            <select v-model="currentElement.rotation">
                                <option value="">Default</option>
                                <option value="None">None - No Rotation</option>
                                <option value="Left">Left - Rotate Left 90°</option>
                                <option value="Right">Right - Rotate Right 90°</option>
                                <option value="UpsideDown">UpsideDown - Upside Down</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Markup Type</label>
                            <select v-model="currentElement.markup">
                                <option value="none">None</option>
                                <option value="html">HTML</option>
                                <option value="rtf">RTF</option>
                                <option value="styledtext">Styled Text</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>{{ t("properties.fontSize") }}</label>
                            <input
                                v-if="currentElement"
                                v-model.number="currentElement.fontSize"
                                type="number"
                            />
                        </div>
                        <div class="checkbox-group">
                            <label>
                                <input
                                    v-if="currentElement"
                                    v-model="currentElement.isBold"
                                    type="checkbox"
                                />
                                {{ t("properties.bold") }}
                            </label>
                            <label>
                                <input
                                    v-if="currentElement"
                                    v-model="currentElement.isItalic"
                                    type="checkbox"
                                />
                                {{ t("properties.italic") }}
                            </label>
                            <label>
                                <input
                                    v-if="currentElement"
                                    v-model="currentElement.isUnderline"
                                    type="checkbox"
                                />
                                {{ t("properties.underline") }}
                            </label>
                        </div>
                    </template>

                    <!-- Image properties -->
                    <template
                        v-if="
                            currentElement &&
                            currentElement.type === 'image'
                        "
                    >
                        <div class="form-group">
                            <label>Image Expression</label>
                            <ExpressionEditor
                                :model-value="currentElement.imageExpression || ''"
                                @update:model-value="currentElement.imageExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder='e.g.: $P{imagePath} or "logo.png"'
                            />
                        </div>
                        <div class="form-group">
                            <label>Scale Type</label>
                            <select v-model="currentElement.scaleType">
                                <option value="">Default</option>
                                <option value="Clip">Clip - Clip</option>
                                <option value="FillFrame">FillFrame - Fill Frame</option>
                                <option value="RetainShape">RetainShape - Retain Shape</option>
                                <option value="RealHeight">RealHeight - Real Height</option>
                                <option value="RealSize">RealSize - Real Size</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Rotation</label>
                            <select v-model="currentElement.rotation">
                                <option value="">Default</option>
                                <option value="None">None - No Rotation</option>
                                <option value="Left">Left - Rotate Left 90°</option>
                                <option value="Right">Right - Rotate Right 90°</option>
                                <option value="UpsideDown">UpsideDown - Upside Down</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Horizontal Alignment</label>
                            <select v-model="currentElement.hAlign">
                                <option value="">Default</option>
                                <option value="Left">Left - Align Left</option>
                                <option value="Center">Center - Center</option>
                                <option value="Right">Right - Align Right</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Vertical Alignment</label>
                            <select v-model="currentElement.vAlign">
                                <option value="">Default</option>
                                <option value="Top">Top - Align Top</option>
                                <option value="Middle">Middle - Center</option>
                                <option value="Bottom">Bottom - Align Bottom</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Error Handling</label>
                            <select v-model="currentElement.onErrorType">
                                <option value="">Default</option>
                                <option value="Error">Error - Throw Error</option>
                                <option value="Blank">Blank - Blank</option>
                                <option value="Icon">Icon - Icon</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <SwitchControl
                                :model-value="currentElement.isUsingCache !== false"
                                @update:model-value="currentElement.isUsingCache = $event"
                                label="Use Cache"
                            />
                        </div>
                    </template>

                    <!-- Rectangle properties -->
                    <template
                        v-if="
                            currentElement &&
                            currentElement.type === 'rectangle'
                        "
                    >
                        <div class="form-group">
                            <label>Corner Radius</label>
                            <input
                                v-model.number="currentElement.radius"
                                type="number"
                                min="0"
                                placeholder="0"
                            />
                        </div>
                        <div class="form-group">
                            <SwitchControl
                                :model-value="
                                    currentElement.isPrintRepeatedValues !==
                                    false
                                "
                                @update:model-value="
                                    currentElement.isPrintRepeatedValues =
                                        $event
                                "
                                label="Print Repeated Values"
                            />
                        </div>
                    </template>

                    <!-- Ellipse properties -->
                    <template
                        v-if="
                            currentElement && currentElement.type === 'ellipse'
                        "
                    >
                        <div class="form-group">
                            <SwitchControl
                                :model-value="
                                    currentElement.isPrintRepeatedValues !==
                                    false
                                "
                                @update:model-value="
                                    currentElement.isPrintRepeatedValues =
                                        $event
                                "
                                label="Print Repeated Values"
                            />
                        </div>
                    </template>

                    <!-- Line properties -->
                    <template
                        v-if="currentElement && currentElement.type === 'line'"
                    >
                        <div class="form-group">
                            <label>Line Direction</label>
                            <select v-model="currentElement.lineDirection">
                                <option value="">Default (TopDown)</option>
                                <option value="TopDown">TopDown - Top to Bottom</option>
                                <option value="BottomUp">BottomUp - Bottom to Top</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <SwitchControl
                                :model-value="
                                    currentElement.isPrintRepeatedValues !==
                                    false
                                "
                                @update:model-value="
                                    currentElement.isPrintRepeatedValues =
                                        $event
                                "
                                label="Print Repeated Values"
                            />
                        </div>
                    </template>

                    <!-- Break properties -->
                    <template
                        v-if="currentElement && currentElement.type === 'break'"
                    >
                        <div class="form-group">
                            <label>Break Type</label>
                            <select v-model="currentElement.breakType">
                                <option value="Page">Page - Page Break</option>
                                <option value="Column">Column - Column Break</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <SwitchControl
                                :model-value="
                                    currentElement.isResetPageNumber || false
                                "
                                @update:model-value="
                                    currentElement.isResetPageNumber = $event
                                "
                                label="Reset Page Number"
                            />
                        </div>
                        <div class="form-group">
                            <SwitchControl
                                :model-value="
                                    currentElement.isResetPageOverflow || false
                                "
                                @update:model-value="
                                    currentElement.isResetPageOverflow = $event
                                "
                                label="Reset Page Overflow"
                            />
                        </div>
                    </template>

                    <template
                        v-else-if="
                            currentElement &&
                            currentElement.type === 'textField'
                        "
                    >
                        <div
                            class="form-group"
                            v-if="
                                currentElement &&
                                currentElement.type === 'textField'
                            "
                        >
                            <label>{{ t("properties.expression") }}</label>
                            <ExpressionEditor
                                :model-value="getTextFieldExpression(currentElement)"
                                @update:model-value="updateTextFieldExpression"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                :placeholder="t('properties.expressionHint', { fieldHolder: '$F{fieldName}' })"
                            />
                        </div>
                        <div class="form-group">
                            <label>{{ t("properties.pattern") }}</label>
                            <input
                                v-if="currentElement"
                                v-model="currentElement.pattern"
                                type="text"
                            />
                            <small>{{ t("properties.patternHint") }}</small>
                        </div>

                        <!-- Added: Evaluation Time -->
                        <div class="form-group">
                            <label>Evaluation Time</label>
                            <select
                                v-if="currentElement"
                                v-model="currentElement.evaluationTime"
                            >
                                <option value="Now">Now - Evaluate Immediately</option>
                                <option value="Report">Report - At Report End</option>
                                <option value="Page">Page - At Page End</option>
                                <option value="Column">Column - At Column End</option>
                                <option value="Group">Group - At Group End</option>
                                <option value="Band">Band - At Band End</option>
                                <option value="Auto">Auto - Engine Decides</option>
                                <option value="Master">Master - At Master Report End</option>
                            </select>
                        </div>

                        <!-- Added: Hyperlink Type -->
                        <div class="form-group">
                            <label>Hyperlink Type</label>
                            <select
                                v-if="currentElement"
                                v-model="currentElement.hyperlinkType"
                            >
                                <option value="None">None</option>
                                <option value="Reference">Reference - URL Reference</option>
                                <option value="Anchor">Anchor - Anchor</option>
                                <option value="LocalAnchor">LocalAnchor - Local Anchor</option>
                                <option value="LocalPage">LocalPage - Local Page</option>
                                <option value="RemotePage">RemotePage - Remote Page</option>
                                <option value="RemoteAnchor">RemoteAnchor - Remote Anchor</option>
                                <option value="mailto">mailto - Email</option>
                            </select>
                        </div>

                        <!-- Added: Hyperlink Reference Expression -->
                        <div class="form-group" v-if="currentElement.hyperlinkType === 'Reference'">
                            <label>Hyperlink Reference Expression</label>
                            <ExpressionEditor
                                :model-value="currentElement.hyperlinkReferenceExpression || ''"
                                @update:model-value="currentElement.hyperlinkReferenceExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: &quot;https://example.com&quot;"
                            />
                        </div>

                        <!-- Added: Hyperlink Tooltip Expression -->
                        <div class="form-group" v-if="currentElement.hyperlinkType && currentElement.hyperlinkType !== 'None'">
                            <label>Hyperlink Tooltip</label>
                            <ExpressionEditor
                                :model-value="currentElement.hyperlinkTooltipExpression || ''"
                                @update:model-value="currentElement.hyperlinkTooltipExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: &quot;Click to view&quot;"
                            />
                        </div>

                        <!-- Added: Anchor Name Expression -->
                        <div class="form-group" v-if="currentElement.hyperlinkType === 'Anchor' || currentElement.hyperlinkType === 'LocalAnchor'">
                            <label>Anchor Name Expression</label>
                            <ExpressionEditor
                                :model-value="currentElement.anchorNameExpression || ''"
                                @update:model-value="currentElement.anchorNameExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: &quot;anchor1&quot;"
                            />
                        </div>

                        <!-- Added: Blank When Null -->
                        <div class="form-group">
                            <SwitchControl
                                :model-value="
                                    currentElement.isBlankWhenNull !== false
                                "
                                @update:model-value="
                                    currentElement.isBlankWhenNull = $event
                                "
                                label="Blank When Null"
                            />
                        </div>

                        <!-- Added: Bookmark Level -->
                        <div class="form-group">
                            <label>Bookmark Level</label>
                            <input
                                v-if="currentElement"
                                v-model.number="currentElement.bookmarkLevel"
                                type="number"
                                min="0"
                            />
                        </div>
                    </template>
                </n-tab-pane>

                <!-- Element general settings tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type !== 'sort'"
                    name="elementSettings"
                    :tab="'Element Settings'"
                >
                    <div class="form-group">
                        <label>Element Key</label>
                        <input v-model="currentElement.key" type="text" placeholder="Used to identify the element at runtime" />
                    </div>
                    <div class="form-group">
                        <label>Position Type</label>
                        <select v-model="currentElement.positionType">
                            <option value="">Default (FixRelativeToTop)</option>
                            <option value="FixRelativeToTop">FixRelativeToTop - Fixed Relative to Top</option>
                            <option value="FixRelativeToBottom">FixRelativeToBottom - Fixed Relative to Bottom</option>
                            <option value="Float">Float - Float</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Stretch Type</label>
                        <select v-model="currentElement.stretchType">
                            <option value="">Default (NoStretch)</option>
                            <option value="NoStretch">NoStretch - No Stretch</option>
                            <option value="ElementGroupBottom">ElementGroupBottom - Stretch to Group Bottom</option>
                            <option value="ElementGroupHeight">ElementGroupHeight - Stretch to Group Height</option>
                            <option value="ContainerBottom">ContainerBottom - Stretch to Container Bottom</option>
                            <option value="ContainerHeight">ContainerHeight - Stretch to Container Height</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Conditional Style Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.styleExpression || ''"
                            @update:model-value="currentElement.styleExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder="e.g.: $V{rowNumber} % 2 == 0 ? &quot;evenRow&quot; : &quot;&quot;"
                        />
                    </div>

                    <!-- Custom properties -->
                    <div class="form-group">
                        <label>Custom Properties</label>
                        <div v-if="currentElement.properties && currentElement.properties.length > 0" style="margin-bottom: 8px;">
                            <div v-for="(prop, index) in currentElement.properties" :key="index" style="display: flex; gap: 4px; margin-bottom: 4px;">
                                <input v-model="prop.name" type="text" placeholder="Property Name" style="flex: 1;" />
                                <input v-model="prop.value" type="text" placeholder="Property Value" style="flex: 1;" />
                                <button @click="currentElement.properties.splice(index, 1)" type="button" class="prop-btn-danger" style="padding: 2px 6px;">×</button>
                            </div>
                        </div>
                        <button @click="addProperty" type="button" class="prop-btn-primary" style="font-size: 12px;">+ Add Property</button>
                    </div>

                    <!-- Custom property expressions -->
                    <div class="form-group">
                        <label>Custom Property Expressions</label>
                        <div v-if="currentElement.propertyExpressions && currentElement.propertyExpressions.length > 0" style="margin-bottom: 8px;">
                            <div v-for="(prop, index) in currentElement.propertyExpressions" :key="index" style="margin-bottom: 4px;">
                                <div style="display: flex; gap: 4px; margin-bottom: 2px;">
                                    <input v-model="prop.name" type="text" placeholder="Property Name" style="flex: 1;" />
                                    <button @click="currentElement.propertyExpressions.splice(index, 1)" type="button" class="prop-btn-danger" style="padding: 2px 6px;">×</button>
                                </div>
                                <ExpressionEditor
                                    :model-value="prop.valueExpression || ''"
                                    @update:model-value="prop.valueExpression = $event"
                                    :report-fields="reportFields"
                                    :report-parameters="reportParameters"
                                    :report-variables="reportVariables"
                                    placeholder="Property Value Expression"
                                />
                            </div>
                        </div>
                        <button @click="addPropertyExpression" type="button" class="prop-btn-primary" style="font-size: 12px;">+ Add Property Expression</button>
                    </div>
                </n-tab-pane>

                <!-- Table properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'table'"
                    name="table"
                    :tab="t('properties.tableProperties')"
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

                    <!-- Divider -->
                    <div class="prop-divider"></div>

                    <!-- Column management -->
                    <div class="form-group">
                        <h5>Column Management</h5>
                        <div class="column-tree-toolbar">
                            <button
                                class="prop-btn-primary"
                                @click="handleAddRootColumn"
                                title="Add Column"
                            >
                                + Column
                            </button>
                            <button
                                class="prop-btn-primary"
                                @click="handleAddRootGroup"
                                title="Add Group"
                            >
                                + Group
                            </button>
                            <button
                                class="prop-btn-default"
                                @click="addColumnGroup"
                                title="Select Column Combination"
                            >
                                Combine Columns
                            </button>
                        </div>

                        <!-- Column tree -->
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
                                @add-column-group-after="
                                    handleAddColumnGroupAfter
                                "
                                @ungroup-node="handleUngroupNode"
                                @move-node="handleMoveNode"
                            />
                            <div
                                v-if="tableChildren.length === 0"
                                class="column-tree-empty-hint"
                            >
                                Click the button above to add a column
                            </div>
                        </div>
                    </div>

                    <!-- Row height settings -->
                    <div
                        class="form-group"
                        v-if="currentElement && currentElement.type === 'table'"
                    >
                        <h5>Row Height Settings</h5>
                        <div class="prop-table-column-props">
                            <div class="form-group">
                                <label>Header Row Height</label>
                                <input
                                    v-model.number="tableRowHeights.tableHeader"
                                    type="number"
                                    min="1"
                                    @change="updateAllColumnRowHeights"
                                />
                            </div>
                            <div class="form-group">
                                <label>Column Header Row Height</label>
                                <input
                                    v-model.number="
                                        tableRowHeights.columnHeader
                                    "
                                    type="number"
                                    min="1"
                                    @change="updateAllColumnRowHeights"
                                />
                            </div>
                            <div class="form-group">
                                <label>Data Row Height</label>
                                <input
                                    v-model.number="tableRowHeights.detailCell"
                                    type="number"
                                    min="1"
                                    @change="updateAllColumnRowHeights"
                                />
                            </div>
                            <div class="form-group">
                                <label>Column Footer Row Height</label>
                                <input
                                    v-model.number="
                                        tableRowHeights.columnFooter
                                    "
                                    type="number"
                                    min="1"
                                    @change="updateAllColumnRowHeights"
                                />
                            </div>
                            <div class="form-group">
                                <label>Table Footer Row Height</label>
                                <input
                                    v-model.number="tableRowHeights.tableFooter"
                                    type="number"
                                    min="1"
                                    @change="updateAllColumnRowHeights"
                                />
                            </div>
                        </div>
                    </div>
                </n-tab-pane>
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'frame'"
                    name="frame"
                    :tab="'Frame Properties'"
                >
                    <FrameProperties
                        :element="currentElement"
                        :report-fields="reportFields"
                        :report-parameters="reportParameters"
                        :report-variables="reportVariables"
                        @update:element="handleFramePropertyUpdate"
                    />
                </n-tab-pane>

                <!-- Style settings tab -->
                <n-tab-pane name="style" :tab="t('properties.styleSettings')">
                    <template
                        v-if="currentElement && currentElement.type === 'break'"
                    >
                        <div class="box-section">
                            <p style="font-size: 12px; color: #666">
                                {{ t("properties.breakNoStyle") }}
                            </p>
                        </div>
                    </template>
                    <template v-else>
                        <h4>{{ t("properties.styleSettings") }}</h4>

                        <!-- Border settings (not supported for table elements) -->
                        <template v-if="currentElement.type !== 'table'">
                            <!-- Border settings for rectangle/ellipse elements (unified) -->
                            <template
                                v-if="
                                    currentElement &&
                                    (currentElement.type === 'rectangle' ||
                                        currentElement.type === 'ellipse')
                                "
                            >
                                <div class="box-section compact">
                                    <h5>{{ t("properties.unifiedBorder") }}</h5>
                                    <p
                                        style="
                                            font-size: 12px;
                                            color: #666;
                                            margin-bottom: 8px;
                                        "
                                    >
                                        {{ t("properties.unifiedBorderHint") }}
                                    </p>

                                    <div class="border-group-row">
                                        <div class="border-group-item">
                                            <label class="side-label">{{
                                                t("properties.style")
                                            }}</label>
                                            <n-radio-group
                                                v-model:value="
                                                    rectangleBorderStyle
                                                "
                                                @update:value="
                                                    setRectangleBorderStyle(
                                                        rectangleBorderStyle,
                                                    )
                                                "
                                                size="small"
                                            >
                                                <n-radio-button value="">{{
                                                    t("properties.none")
                                                }}</n-radio-button>
                                                <n-radio-button value="Solid">{{
                                                    t("properties.solid")
                                                }}</n-radio-button>
                                                <n-radio-button
                                                    value="Dashed"
                                                    >{{
                                                        t("properties.dashed")
                                                    }}</n-radio-button
                                                >
                                                <n-radio-button
                                                    value="Dotted"
                                                    >{{
                                                        t("properties.dotted")
                                                    }}</n-radio-button
                                                >
                                                <n-radio-button
                                                    value="Double"
                                                    >{{
                                                        t("properties.double")
                                                    }}</n-radio-button
                                                >
                                            </n-radio-group>
                                        </div>

                                        <div class="border-group-item">
                                            <label class="side-label">{{
                                                t("properties.width")
                                            }}</label>
                                            <input
                                                :value="
                                                    getRectangleBorderWidth()
                                                "
                                                @input="
                                                    setRectangleBorderWidth(
                                                        (
                                                            $event.target as HTMLInputElement
                                                        ).value,
                                                    )
                                                "
                                                type="number"
                                                min="0"
                                                max="10"
                                                step="0.5"
                                                class="width-control compact"
                                                :placeholder="
                                                    t('properties.width')
                                                "
                                            />
                                        </div>

                                        <div class="border-group-item">
                                            <label class="side-label">{{
                                                t("properties.color")
                                            }}</label>
                                            <input
                                                :value="
                                                    getRectangleBorderColor()
                                                "
                                                @input="
                                                    setRectangleBorderColor(
                                                        (
                                                            $event.target as HTMLInputElement
                                                        ).value,
                                                    )
                                                "
                                                type="color"
                                                class="color-control compact"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <!-- Border settings for other elements (each side configurable independently) -->
                            <template v-else>
                                <!-- Per-side border settings -->
                                <div class="box-section compact">
                                    <h5>{{ t("properties.sideBorders") }}</h5>

                                    <div class="border-sides-grid">
                                        <!-- Unified setting for all four sides -->
                                        <div class="border-side-item">
                                            <label class="side-label">{{
                                                t("properties.all")
                                            }}</label>
                                            <div class="border-side-controls">
                                                <n-radio-group
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getUnifiedBorderStyle()
                                                    "
                                                    @update:value="
                                                        setUnifiedBorderStyle(
                                                            $event,
                                                        )
                                                    "
                                                    size="small"
                                                >
                                                    <n-radio-button value="">{{
                                                        t("properties.none")
                                                    }}</n-radio-button>
                                                    <n-radio-button
                                                        value="Solid"
                                                        >{{
                                                            t(
                                                                "properties.solid",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dashed"
                                                        >{{
                                                            t(
                                                                "properties.dashed",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dotted"
                                                        >{{
                                                            t(
                                                                "properties.dotted",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Double"
                                                        >{{
                                                            t(
                                                                "properties.double",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                </n-radio-group>
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getUnifiedBorderWidth()
                                                    "
                                                    @input="
                                                        setUnifiedBorderWidth(
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="number"
                                                    min="0"
                                                    max="10"
                                                    step="0.5"
                                                    class="width-control compact"
                                                    :placeholder="
                                                        t('properties.width')
                                                    "
                                                />
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getUnifiedBorderColor()
                                                    "
                                                    @input="
                                                        setUnifiedBorderColor(
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="color"
                                                    class="color-control compact"
                                                />
                                            </div>
                                        </div>

                                        <!-- Top -->
                                        <div class="border-side-item">
                                            <label class="side-label">{{
                                                t("properties.topSide")
                                            }}</label>
                                            <div class="border-side-controls">
                                                <n-radio-group
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderStyle(
                                                            'top',
                                                        )
                                                    "
                                                    @update:value="
                                                        setSideBorderStyle(
                                                            'top',
                                                            $event,
                                                        )
                                                    "
                                                    size="small"
                                                >
                                                    <n-radio-button value="">{{
                                                        t("properties.none")
                                                    }}</n-radio-button>
                                                    <n-radio-button
                                                        value="Solid"
                                                        >{{
                                                            t(
                                                                "properties.solid",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dashed"
                                                        >{{
                                                            t(
                                                                "properties.dashed",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dotted"
                                                        >{{
                                                            t(
                                                                "properties.dotted",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Double"
                                                        >{{
                                                            t(
                                                                "properties.double",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                </n-radio-group>
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderWidth(
                                                            'top',
                                                        )
                                                    "
                                                    @input="
                                                        setSideBorderWidth(
                                                            'top',
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="number"
                                                    min="0"
                                                    max="10"
                                                    step="0.5"
                                                    class="width-control compact"
                                                    :placeholder="
                                                        t('properties.width')
                                                    "
                                                />
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderColor(
                                                            'top',
                                                        )
                                                    "
                                                    @input="
                                                        setSideBorderColor(
                                                            'top',
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="color"
                                                    class="color-control compact"
                                                />
                                            </div>
                                        </div>

                                        <!-- Left -->
                                        <div class="border-side-item">
                                            <label class="side-label">{{
                                                t("properties.leftSide")
                                            }}</label>
                                            <div class="border-side-controls">
                                                <n-radio-group
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderStyle(
                                                            'left',
                                                        )
                                                    "
                                                    @update:value="
                                                        setSideBorderStyle(
                                                            'left',
                                                            $event,
                                                        )
                                                    "
                                                    size="small"
                                                >
                                                    <n-radio-button value="">{{
                                                        t("properties.none")
                                                    }}</n-radio-button>
                                                    <n-radio-button
                                                        value="Solid"
                                                        >{{
                                                            t(
                                                                "properties.solid",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dashed"
                                                        >{{
                                                            t(
                                                                "properties.dashed",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dotted"
                                                        >{{
                                                            t(
                                                                "properties.dotted",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Double"
                                                        >{{
                                                            t(
                                                                "properties.double",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                </n-radio-group>
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderWidth(
                                                            'left',
                                                        )
                                                    "
                                                    @input="
                                                        setSideBorderWidth(
                                                            'left',
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="number"
                                                    min="0"
                                                    max="10"
                                                    step="0.5"
                                                    class="width-control compact"
                                                    :placeholder="
                                                        t('properties.width')
                                                    "
                                                />
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderColor(
                                                            'left',
                                                        )
                                                    "
                                                    @input="
                                                        setSideBorderColor(
                                                            'left',
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="color"
                                                    class="color-control compact"
                                                />
                                            </div>
                                        </div>

                                        <!-- Bottom -->
                                        <div class="border-side-item">
                                            <label class="side-label">{{
                                                t("properties.bottomSide")
                                            }}</label>
                                            <div class="border-side-controls">
                                                <n-radio-group
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderStyle(
                                                            'bottom',
                                                        )
                                                    "
                                                    @update:value="
                                                        setSideBorderStyle(
                                                            'bottom',
                                                            $event,
                                                        )
                                                    "
                                                    size="small"
                                                >
                                                    <n-radio-button value="">{{
                                                        t("properties.none")
                                                    }}</n-radio-button>
                                                    <n-radio-button
                                                        value="Solid"
                                                        >{{
                                                            t(
                                                                "properties.solid",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dashed"
                                                        >{{
                                                            t(
                                                                "properties.dashed",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dotted"
                                                        >{{
                                                            t(
                                                                "properties.dotted",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Double"
                                                        >{{
                                                            t(
                                                                "properties.double",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                </n-radio-group>
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderWidth(
                                                            'bottom',
                                                        )
                                                    "
                                                    @input="
                                                        setSideBorderWidth(
                                                            'bottom',
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="number"
                                                    min="0"
                                                    max="10"
                                                    step="0.5"
                                                    class="width-control compact"
                                                    :placeholder="
                                                        t('properties.width')
                                                    "
                                                />
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderColor(
                                                            'bottom',
                                                        )
                                                    "
                                                    @input="
                                                        setSideBorderColor(
                                                            'bottom',
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="color"
                                                    class="color-control compact"
                                                />
                                            </div>
                                        </div>

                                        <!-- Right -->
                                        <div class="border-side-item">
                                            <label class="side-label">{{
                                                t("properties.rightSide")
                                            }}</label>
                                            <div class="border-side-controls">
                                                <n-radio-group
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderStyle(
                                                            'right',
                                                        )
                                                    "
                                                    @update:value="
                                                        setSideBorderStyle(
                                                            'right',
                                                            $event,
                                                        )
                                                    "
                                                    size="small"
                                                >
                                                    <n-radio-button value="">{{
                                                        t("properties.none")
                                                    }}</n-radio-button>
                                                    <n-radio-button
                                                        value="Solid"
                                                        >{{
                                                            t(
                                                                "properties.solid",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dashed"
                                                        >{{
                                                            t(
                                                                "properties.dashed",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Dotted"
                                                        >{{
                                                            t(
                                                                "properties.dotted",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                    <n-radio-button
                                                        value="Double"
                                                        >{{
                                                            t(
                                                                "properties.double",
                                                            )
                                                        }}</n-radio-button
                                                    >
                                                </n-radio-group>
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderWidth(
                                                            'right',
                                                        )
                                                    "
                                                    @input="
                                                        setSideBorderWidth(
                                                            'right',
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="number"
                                                    min="0"
                                                    max="10"
                                                    step="0.5"
                                                    class="width-control compact"
                                                    :placeholder="
                                                        t('properties.width')
                                                    "
                                                />
                                                <input
                                                    v-if="
                                                        currentElement &&
                                                        currentElement.box
                                                    "
                                                    :value="
                                                        getSideBorderColor(
                                                            'right',
                                                        )
                                                    "
                                                    @input="
                                                        setSideBorderColor(
                                                            'right',
                                                            (
                                                                $event.target as HTMLInputElement
                                                            ).value,
                                                        )
                                                    "
                                                    type="color"
                                                    class="color-control compact"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Padding settings -->
                                <div class="box-section compact">
                                    <h5>
                                        {{ t("properties.marginSettings") }}
                                    </h5>
                                    <div class="form-group compact">
                                        <label>{{
                                            t("properties.globalMargin")
                                        }}</label>
                                        <input
                                            v-if="
                                                currentElement &&
                                                currentElement.box
                                            "
                                            v-model.number="
                                                currentElement.box.padding
                                            "
                                            type="number"
                                            :placeholder="
                                                t('properties.globalMargin')
                                            "
                                            class="small-input"
                                        />
                                        <small>{{
                                            t("properties.globalMarginHint")
                                        }}</small>
                                    </div>

                                    <div class="padding-grid compact">
                                        <div class="form-group compact">
                                            <label>{{
                                                t("properties.topMargin")
                                            }}</label>
                                            <input
                                                v-if="
                                                    currentElement &&
                                                    currentElement.box
                                                "
                                                v-model.number="
                                                    currentElement.box
                                                        .topPadding
                                                "
                                                type="number"
                                                class="small-input"
                                            />
                                        </div>
                                        <div class="form-group compact">
                                            <label>{{
                                                t("properties.leftMargin")
                                            }}</label>
                                            <input
                                                v-if="
                                                    currentElement &&
                                                    currentElement.box
                                                "
                                                v-model.number="
                                                    currentElement.box
                                                        .leftPadding
                                                "
                                                type="number"
                                                class="small-input"
                                            />
                                        </div>
                                        <div class="form-group compact">
                                            <label>{{
                                                t("properties.bottomMargin")
                                            }}</label>
                                            <input
                                                v-if="
                                                    currentElement &&
                                                    currentElement.box
                                                "
                                                v-model.number="
                                                    currentElement.box
                                                        .bottomPadding
                                                "
                                                type="number"
                                                class="small-input"
                                            />
                                        </div>
                                        <div class="form-group compact">
                                            <label>{{
                                                t("properties.rightMargin")
                                            }}</label>
                                            <input
                                                v-if="
                                                    currentElement &&
                                                    currentElement.box
                                                "
                                                v-model.number="
                                                    currentElement.box
                                                        .rightPadding
                                                "
                                                type="number"
                                                class="small-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </template>
                        <div class="form-group-row">
                            <div class="form-group half-width">
                                <label>{{ t("properties.forecolor") }}</label>
                                <ColorPickerWithOpacity
                                    v-model="currentElement.forecolor"
                                    v-model:mode="currentElement.forecolorMode"
                                    @update:modelValue="emit('update-jrxml')"
                                    @update:mode="emit('update-jrxml')"
                                />
                            </div>

                            <div class="form-group half-width">
                                <label>{{
                                    t("properties.backgroundColor")
                                }}</label>
                                <ColorPickerWithOpacity
                                    v-model="currentElement.backcolor"
                                    v-model:mode="currentElement.mode"
                                    @update:modelValue="emit('update-jrxml')"
                                    @update:mode="emit('update-jrxml')"
                                />
                            </div>
                        </div>

                        <div class="form-group">
                            <label>{{ t("properties.backgroundMode") }}</label>
                            <select
                                v-if="currentElement"
                                v-model="currentElement.mode"
                                @change="emit('update-jrxml')"
                            >
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

                        <!-- Table-specific style settings -->
                        <template
                            v-if="
                                currentElement &&
                                currentElement.type === 'table'
                            "
                        >
                            <div class="form-group">
                                <h5>
                                    {{ t("properties.tableStyleSettings") }}
                                </h5>
                                <div class="table-style-settings">
                                    <!-- Table header style selection -->
                                    <div class="table-style-section">
                                        <h6>
                                            {{ t("properties.tableHeader") }}
                                            {{ t("properties.style") }}
                                        </h6>
                                        <div class="box-section compact">
                                            <div class="form-group">
                                                <label>{{
                                                    t("properties.selectStyle")
                                                }}</label>
                                                <select
                                                    v-model="
                                                        tableStyles.tableHeader
                                                    "
                                                    @change="
                                                        updateTableStyles();
                                                        emit('update-jrxml');
                                                    "
                                                >
                                                    <option value="Table_TH">
                                                        Table_TH
                                                    </option>
                                                    <option value="Table_CH">
                                                        Table_CH
                                                    </option>
                                                    <option value="Table_TD">
                                                        Table_TD
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Column header style selection -->
                                    <div class="table-style-section">
                                        <h6>
                                            {{ t("properties.columnHeader") }}
                                            {{ t("properties.style") }}
                                        </h6>
                                        <div class="box-section compact">
                                            <div class="form-group">
                                                <label>{{
                                                    t("properties.selectStyle")
                                                }}</label>
                                                <select
                                                    v-model="
                                                        tableStyles.columnHeader
                                                    "
                                                    @change="
                                                        updateTableStyles();
                                                        emit('update-jrxml');
                                                    "
                                                >
                                                    <option value="Table_TH">
                                                        Table_TH
                                                    </option>
                                                    <option value="Table_CH">
                                                        Table_CH
                                                    </option>
                                                    <option value="Table_TD">
                                                        Table_TD
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Column footer style selection -->
                                    <div class="table-style-section">
                                        <h6>
                                            {{ t("properties.columnFooter") }}
                                            {{ t("properties.style") }}
                                        </h6>
                                        <div class="box-section compact">
                                            <div class="form-group">
                                                <label>{{
                                                    t("properties.selectStyle")
                                                }}</label>
                                                <select
                                                    v-model="
                                                        tableStyles.columnFooter
                                                    "
                                                    @change="
                                                        updateTableStyles();
                                                        emit('update-jrxml');
                                                    "
                                                >
                                                    <option value="Table_TH">
                                                        Table_TH
                                                    </option>
                                                    <option value="Table_CH">
                                                        Table_CH
                                                    </option>
                                                    <option value="Table_TD">
                                                        Table_TD
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Detail cell style selection -->
                                    <div class="table-style-section">
                                        <h6>
                                            {{ t("properties.detailCell") }}
                                            {{ t("properties.style") }}
                                        </h6>
                                        <div class="box-section compact">
                                            <div class="form-group">
                                                <label>{{
                                                    t("properties.selectStyle")
                                                }}</label>
                                                <select
                                                    v-model="
                                                        tableStyles.detailCell
                                                    "
                                                    @change="
                                                        updateTableStyles();
                                                        emit('update-jrxml');
                                                    "
                                                >
                                                    <option value="Table_TH">
                                                        Table_TH
                                                    </option>
                                                    <option value="Table_CH">
                                                        Table_CH
                                                    </option>
                                                    <option value="Table_TD">
                                                        Table_TD
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>

                        <!-- Style settings for other elements -->
                        <template
                            v-else-if="
                                currentElement &&
                                currentElement.type !== 'line' &&
                                currentElement.type !== 'image' &&
                                currentElement.type !== 'frame'
                            "
                        >
                            <div class="form-group">
                                <label>{{ t("properties.fontName") }}</label>
                                <select
                                    v-if="currentElement"
                                    v-model="currentElement.fontFamily"
                                    style="
                                        appearance: none;
                                        -webkit-appearance: none;
                                    "
                                >
                                    <option value="">
                                        {{ t("properties.useDefaultFont") }}
                                    </option>
                                    <option
                                        v-for="font in availableFonts"
                                        :key="font"
                                        :value="font"
                                    >
                                        {{ font }}
                                    </option>
                                </select>
                                <small class="font-hint">{{
                                    t("properties.fontHint")
                                }}</small>
                            </div>

                            <div class="form-group-row">
                                <div class="form-group half-width">
                                    <label>{{
                                        t("properties.textAlignment")
                                    }}</label>
                                    <div class="alignment-controls compact">
                                        <n-button
                                            v-for="align in [
                                                'Left',
                                                'Center',
                                                'Right',
                                            ]"
                                            :key="align"
                                            @click="
                                                setHorizontalAlignment(
                                                    align as
                                                        | 'Left'
                                                        | 'Center'
                                                        | 'Right',
                                                )
                                            "
                                            :type="
                                                currentElement &&
                                                currentElement.textAlignment ===
                                                    align
                                                    ? 'primary'
                                                    : 'default'
                                            "
                                            :title="
                                                t(
                                                    `properties.${align.toLowerCase()}`,
                                                )
                                            "
                                            size="small"
                                        >
                                            {{
                                                t(
                                                    `properties.${align.toLowerCase()}`,
                                                )
                                            }}
                                        </n-button>
                                    </div>
                                </div>

                                <div class="form-group half-width">
                                    <label>{{
                                        t("properties.verticalAlignment")
                                    }}</label>
                                    <div class="alignment-controls compact">
                                        <n-button
                                            v-for="align in [
                                                'Top',
                                                'Middle',
                                                'Bottom',
                                            ]"
                                            :key="align"
                                            @click="
                                                setVerticalAlignment(
                                                    align as
                                                        | 'Top'
                                                        | 'Middle'
                                                        | 'Bottom',
                                                )
                                            "
                                            :type="
                                                currentElement &&
                                                currentElement.verticalAlignment ===
                                                    align
                                                    ? 'primary'
                                                    : 'default'
                                            "
                                            :title="
                                                t(
                                                    `properties.${align.toLowerCase()}`,
                                                )
                                            "
                                            size="small"
                                        >
                                            {{
                                                t(
                                                    `properties.${align.toLowerCase()}`,
                                                )
                                            }}
                                        </n-button>
                                    </div>
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 8px">
                                <label>{{ t("properties.fontStyle") }}</label>
                                <div class="checkbox-group compact">
                                    <label>
                                        <input
                                            v-if="currentElement"
                                            v-model="currentElement.isBold"
                                            type="checkbox"
                                        />
                                        {{ t("properties.bold") }}
                                    </label>
                                    <label>
                                        <input
                                            v-if="currentElement"
                                            v-model="currentElement.isItalic"
                                            type="checkbox"
                                        />
                                        {{ t("properties.italic") }}
                                    </label>
                                    <label>
                                        <input
                                            v-if="currentElement"
                                            v-model="currentElement.isUnderline"
                                            type="checkbox"
                                        />
                                        {{ t("properties.underline") }}
                                    </label>
                                </div>
                            </div>
                        </template>
                    </template>
                </n-tab-pane>

                <!-- Subreport properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'subreport'"
                    name="subreport"
                    :tab="'Subreport Properties'"
                >
                    <div class="form-group">
                        <label>Subreport Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.subreportExpression || ''"
                            @update:model-value="currentElement.subreportExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder="e.g.: $P{SUBREPORT_DIR} + 'subreport.jasper'"
                        />
                    </div>
                    <div class="form-group">
                        <label>Connection Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.connectionExpression || ''"
                            @update:model-value="currentElement.connectionExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder="e.g.: $P{REPORT_CONNECTION}"
                        />
                    </div>
                    <div class="form-group">
                        <label>Data Source Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.dataSourceExpression || ''"
                            @update:model-value="currentElement.dataSourceExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder="e.g.: $P{REPORT_DATA_SOURCE}"
                        />
                    </div>
                    <div class="form-group">
                        <label>Parameters Map Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.parametersMapExpression || ''"
                            @update:model-value="currentElement.parametersMapExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder="e.g.: $P{REPORT_PARAMETERS_MAP}"
                        />
                    </div>
                    <div class="form-group">
                        <label>Evaluation Time</label>
                        <select v-model="currentElement.evaluationTime">
                            <option value="Now">Now - Evaluate Immediately</option>
                            <option value="Report">Report - At Report End</option>
                            <option value="Page">Page - At Page End</option>
                            <option value="Column">Column - At Column End</option>
                            <option value="Group">Group - At Group End</option>
                            <option value="Band">Band - At Band End</option>
                            <option value="Auto">Auto - Engine Decides</option>
                            <option value="Master">Master - At Master Report End</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <SwitchControl
                            :model-value="currentElement.isUsingCache || false"
                            @update:model-value="currentElement.isUsingCache = $event"
                            label="Use Cache"
                        />
                    </div>
                    <div class="form-group">
                        <SwitchControl
                            :model-value="currentElement.isIgnorePagination || false"
                            @update:model-value="currentElement.isIgnorePagination = $event"
                            label="Ignore Pagination"
                        />
                    </div>
                </n-tab-pane>

                <!-- Chart properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'chart'"
                    name="chart"
                    :tab="'Chart Properties'"
                >
                    <div class="form-group">
                        <label>Chart Type</label>
                        <select v-model="currentElement.chartType">
                            <optgroup label="Category Charts">
                                <option value="pie">Pie Chart</option>
                                <option value="pie3D">3D Pie Chart</option>
                                <option value="bar">Bar Chart</option>
                                <option value="bar3D">3D Bar Chart</option>
                                <option value="stackedBar">Stacked Bar Chart</option>
                                <option value="stackedBar3D">3D Stacked Bar Chart</option>
                                <option value="line">Line Chart</option>
                                <option value="area">Area Chart</option>
                                <option value="stackedArea">Stacked Area Chart</option>
                            </optgroup>
                            <optgroup label="XY Charts">
                                <option value="xyBar">XY Bar Chart</option>
                                <option value="xyLine">XY Line Chart</option>
                                <option value="xyArea">XY Area Chart</option>
                                <option value="scatter">Scatter Chart</option>
                                <option value="bubble">Bubble Chart</option>
                                <option value="timeSeries">Time Series</option>
                            </optgroup>
                            <optgroup label="Financial Charts">
                                <option value="highLow">High-Low Chart</option>
                                <option value="candlestick">Candlestick Chart</option>
                            </optgroup>
                            <optgroup label="Special Charts">
                                <option value="meter">Meter</option>
                                <option value="thermometer">Thermometer</option>
                                <option value="multiAxis">Multi-Axis Chart</option>
                                <option value="gantt">Gantt Chart</option>
                                <option value="spider">Spider Chart</option>
                            </optgroup>
                        </select>
                    </div>

                    <!-- Chart settings -->
                    <div class="form-group">
                        <label>Render Type</label>
                        <select v-model="currentElement.renderType">
                            <option value="">Default</option>
                            <option value="svg">SVG</option>
                            <option value="draw">Draw</option>
                            <option value="image">Image</option>
                        </select>
                    </div>
                    <div class="form-group" style="display: flex; gap: 16px;">
                        <label style="display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                            <input type="checkbox" v-model="currentElement.isShowTitle" />
                            Show Title
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                            <input type="checkbox" v-model="currentElement.isShowSubtitle" />
                            Show Subtitle
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                            <input type="checkbox" v-model="currentElement.isShowLegend" />
                            Show Legend
                        </label>
                    </div>
                    <div class="form-group">
                        <label>Customizer Class</label>
                        <input v-model="currentElement.customizerClass" type="text" placeholder="com.example.MyChartCustomizer" />
                    </div>

                    <!-- Title expression -->
                    <div class="form-group">
                        <label>Title Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.titleExpression || ''"
                            @update:model-value="currentElement.titleExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>
                    <div class="form-group">
                        <label>Title Text</label>
                        <input v-model="currentElement.title" type="text" />
                    </div>
                    <div class="form-group">
                        <label>Subtitle Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.subtitleExpression || ''"
                            @update:model-value="currentElement.subtitleExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>
                    <div class="form-group">
                        <label>Legend Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.legendExpression || ''"
                            @update:model-value="currentElement.legendExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>

                    <!-- Dataset settings -->
                    <div style="border-top: 1px solid #e8e8e8; margin: 8px 0; padding-top: 8px;">
                        <label style="font-weight: 600; font-size: 12px; color: #666; margin-bottom: 6px; display: block;">Dataset</label>
                    </div>
                    <div class="form-group">
                        <label>Sub-Dataset Name</label>
                        <input v-model="currentElement.subDataset" type="text" placeholder="e.g.: pieDataset" />
                    </div>
                    <div class="form-group">
                        <label>Data Source Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.dataSourceExpression || ''"
                            @update:model-value="currentElement.dataSourceExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder="e.g.: $P{myDatasource}"
                        />
                    </div>
                    <div class="form-group">
                        <label>Increment Type</label>
                        <select v-model="currentElement.incrementType">
                            <option value="">None</option>
                            <option value="None">None</option>
                            <option value="Group">Group</option>
                            <option value="Page">Page</option>
                            <option value="Column">Column</option>
                            <option value="Report">Report</option>
                        </select>
                    </div>
                    <div class="form-group" v-if="currentElement.incrementType === 'Group'">
                        <label>Increment Group</label>
                        <input v-model="currentElement.incrementGroup" type="text" />
                    </div>

                    <!-- Series expression (category charts) -->
                    <template v-if="['bar','bar3D','stackedBar','stackedBar3D','line','area','stackedArea'].includes(currentElement.chartType)">
                        <div style="border-top: 1px solid #e8e8e8; margin: 8px 0; padding-top: 8px;">
                            <label style="font-weight: 600; font-size: 12px; color: #666; margin-bottom: 6px; display: block;">Series Expression</label>
                        </div>
                        <div class="form-group">
                            <label>Series</label>
                            <ExpressionEditor
                                :model-value="currentElement.seriesExpression || ''"
                                @update:model-value="currentElement.seriesExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $F{sales_state}"
                            />
                        </div>
                        <div class="form-group">
                            <label>Category</label>
                            <ExpressionEditor
                                :model-value="currentElement.categoryExpression || ''"
                                @update:model-value="currentElement.categoryExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $F{full_name}"
                            />
                        </div>
                        <div class="form-group">
                            <label>Value</label>
                            <ExpressionEditor
                                :model-value="currentElement.valueExpression || ''"
                                @update:model-value="currentElement.valueExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $V{amount}"
                            />
                        </div>
                    </template>

                    <!-- Pie chart expression -->
                    <template v-if="['pie','pie3D'].includes(currentElement.chartType)">
                        <div style="border-top: 1px solid #e8e8e8; margin: 8px 0; padding-top: 8px;">
                            <label style="font-weight: 600; font-size: 12px; color: #666; margin-bottom: 6px; display: block;">Pie Chart Expression</label>
                        </div>
                        <div class="form-group">
                            <label>Key</label>
                            <ExpressionEditor
                                :model-value="currentElement.keyExpression || ''"
                                @update:model-value="currentElement.keyExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $F{category}"
                            />
                        </div>
                        <div class="form-group">
                            <label>Value</label>
                            <ExpressionEditor
                                :model-value="currentElement.valueExpression || ''"
                                @update:model-value="currentElement.valueExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $V{amount}"
                            />
                        </div>
                    </template>

                    <!-- XY chart expression -->
                    <template v-if="['scatter','bubble','xyLine','xyArea','xyBar','timeSeries','highLow','candlestick'].includes(currentElement.chartType)">
                        <div style="border-top: 1px solid #e8e8e8; margin: 8px 0; padding-top: 8px;">
                            <label style="font-weight: 600; font-size: 12px; color: #666; margin-bottom: 6px; display: block;">XY Series Expression</label>
                        </div>
                        <div class="form-group">
                            <label>Series</label>
                            <ExpressionEditor
                                :model-value="currentElement.seriesExpression || ''"
                                @update:model-value="currentElement.seriesExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $F{series}"
                            />
                        </div>
                        <div class="form-group">
                            <label>X Value</label>
                            <ExpressionEditor
                                :model-value="currentElement.xValueExpression || ''"
                                @update:model-value="currentElement.xValueExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $F{x_value}"
                            />
                        </div>
                        <div class="form-group">
                            <label>Y Value</label>
                            <ExpressionEditor
                                :model-value="currentElement.yValueExpression || ''"
                                @update:model-value="currentElement.yValueExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $F{y_value}"
                            />
                        </div>
                    </template>

                    <!-- Meter/thermometer expression -->
                    <template v-if="['meter','thermometer'].includes(currentElement.chartType)">
                        <div style="border-top: 1px solid #e8e8e8; margin: 8px 0; padding-top: 8px;">
                            <label style="font-weight: 600; font-size: 12px; color: #666; margin-bottom: 6px; display: block;">Meter Settings</label>
                        </div>
                        <div class="form-group">
                            <label>Data Expression</label>
                            <ExpressionEditor
                                :model-value="currentElement.dataExpression || ''"
                                @update:model-value="currentElement.dataExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $V{value}"
                            />
                        </div>
                        <div class="form-group" v-if="currentElement.chartType === 'meter'">
                            <label>Shape</label>
                            <select v-model="currentElement.shape">
                                <option value="">Default</option>
                                <option value="chord">Chord</option>
                                <option value="pie">Pie</option>
                                <option value="circle">Circle</option>
                                <option value="fan">Fan</option>
                                <option value="dash">Dash</option>
                                <option value="bullet">Bullet</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Units</label>
                            <input v-model="currentElement.units" type="text" placeholder="e.g.: %" />
                        </div>
                        <div class="form-group">
                            <label>Low Threshold</label>
                            <ExpressionEditor
                                :model-value="currentElement.lowExpression || ''"
                                @update:model-value="currentElement.lowExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: 0"
                            />
                        </div>
                        <div class="form-group">
                            <label>Medium Threshold</label>
                            <ExpressionEditor
                                :model-value="currentElement.mediumExpression || ''"
                                @update:model-value="currentElement.mediumExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: 50"
                            />
                        </div>
                        <div class="form-group">
                            <label>High Threshold</label>
                            <ExpressionEditor
                                :model-value="currentElement.highExpression || ''"
                                @update:model-value="currentElement.highExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: 100"
                            />
                        </div>
                    </template>

                    <!-- Plot settings (category charts) -->
                    <template v-if="['bar','bar3D','stackedBar','stackedBar3D','line','area','stackedArea'].includes(currentElement.chartType)">
                        <div style="border-top: 1px solid #e8e8e8; margin: 8px 0; padding-top: 8px;">
                            <label style="font-weight: 600; font-size: 12px; color: #666; margin-bottom: 6px; display: block;">Plot Settings</label>
                        </div>
                        <div class="form-group" v-if="['line'].includes(currentElement.chartType)">
                            <label style="display: flex; align-items: center; gap: 4px;">
                                <input type="checkbox" v-model="currentElement.isShowShapes" />
                                Show Data Point Shapes
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Label Color</label>
                            <input v-model="currentElement.itemLabelColor" type="color" style="width: 60px; height: 30px;" />
                        </div>
                        <div class="form-group">
                            <label>Label Background Color</label>
                            <input v-model="currentElement.itemLabelBackgroundColor" type="color" style="width: 60px; height: 30px;" />
                        </div>
                        <div class="form-group">
                            <label>Category Axis Label</label>
                            <ExpressionEditor
                                :model-value="currentElement.categoryAxisLabelExpression || ''"
                                @update:model-value="currentElement.categoryAxisLabelExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: $F{axis_label}"
                            />
                        </div>
                        <div class="form-group">
                            <label>Value Axis Label</label>
                            <ExpressionEditor
                                :model-value="currentElement.valueAxisLabelExpression || ''"
                                @update:model-value="currentElement.valueAxisLabelExpression = $event"
                                :report-fields="reportFields"
                                :report-parameters="reportParameters"
                                :report-variables="reportVariables"
                                placeholder="e.g.: Amount"
                            />
                        </div>
                    </template>

                    <!-- Pie chart plot settings -->
                    <template v-if="['pie','pie3D'].includes(currentElement.chartType)">
                        <div style="border-top: 1px solid #e8e8e8; margin: 8px 0; padding-top: 8px;">
                            <label style="font-weight: 600; font-size: 12px; color: #666; margin-bottom: 6px; display: block;">Plot Settings</label>
                        </div>
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 4px;">
                                <input type="checkbox" v-model="currentElement.isCircular" />
                                Circular Display
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Label Color</label>
                            <input v-model="currentElement.itemLabelColor" type="color" style="width: 60px; height: 30px;" />
                        </div>
                        <div class="form-group">
                            <label>Label Background Color</label>
                            <input v-model="currentElement.itemLabelBackgroundColor" type="color" style="width: 60px; height: 30px;" />
                        </div>
                    </template>

                    <!-- Hyperlink settings -->
                    <div style="border-top: 1px solid #e8e8e8; margin: 8px 0; padding-top: 8px;">
                        <label style="font-weight: 600; font-size: 12px; color: #666; margin-bottom: 6px; display: block;">Hyperlink</label>
                    </div>
                    <div class="form-group">
                        <label>Tooltip Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.hyperlinkTooltipExpression || ''"
                            @update:model-value="currentElement.hyperlinkTooltipExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>
                    <div class="form-group">
                        <label>Hyperlink Type</label>
                        <select v-model="currentElement.hyperlinkType">
                            <option value="">None</option>
                            <option value="Reference">Reference</option>
                            <option value="LocalAnchor">LocalAnchor</option>
                            <option value="LocalPage">LocalPage</option>
                            <option value="RemoteAnchor">RemoteAnchor</option>
                            <option value="RemotePage">RemotePage</option>
                            <option value="Tooltip">Tooltip</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Hyperlink Target</label>
                        <select v-model="currentElement.hyperlinkTarget">
                            <option value="">Default</option>
                            <option value="Self">Self</option>
                            <option value="Blank">Blank</option>
                            <option value="Top">Top</option>
                            <option value="Parent">Parent</option>
                        </select>
                    </div>
                    <div class="form-group" v-if="currentElement.hyperlinkType">
                        <label>Hyperlink Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.hyperlinkExpression || ''"
                            @update:model-value="currentElement.hyperlinkExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>
                    <div class="form-group">
                        <label>Bookmark Level</label>
                        <input v-model.number="currentElement.bookmarkLevel" type="number" min="0" max="10" />
                    </div>
                </n-tab-pane>

                <!-- Barcode properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'barcode'"
                    name="barcode"
                    :tab="'Barcode Properties'"
                >
                    <div class="form-group">
                        <label>Barcode Type</label>
                        <select v-model="currentElement.barcodeType">
                            <option value="Code128">Code128</option>
                            <option value="Code39">Code39</option>
                            <option value="EAN13">EAN13</option>
                            <option value="EAN8">EAN8</option>
                            <option value="UPCA">UPC-A</option>
                            <option value="UPCE">UPC-E</option>
                            <option value="QRCode">QR Code</option>
                            <option value="DataMatrix">Data Matrix</option>
                            <option value="Interleaved2Of5">Interleaved 2 of 5</option>
                            <option value="Codabar">Codabar</option>
                            <option value="EAN128">EAN128</option>
                            <option value="PDF417">PDF417</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Barcode Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.codeExpression || ''"
                            @update:model-value="currentElement.codeExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder='e.g.: "1234567890"'
                        />
                    </div>
                </n-tab-pane>

                <!-- Map properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'map'"
                    name="map"
                    :tab="'Map Properties'"
                >
                    <div class="form-group">
                        <label>Map Type</label>
                        <select v-model="currentElement.mapType">
                            <option value="html">HTML</option>
                            <option value="image">Image</option>
                            <option value="pdf">PDF</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Latitude Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.latExpression || ''"
                            @update:model-value="currentElement.latExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>
                    <div class="form-group">
                        <label>Longitude Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.lngExpression || ''"
                            @update:model-value="currentElement.lngExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>
                    <div class="form-group">
                        <label>Zoom Level Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.zoomExpression || ''"
                            @update:model-value="currentElement.zoomExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>
                    <div class="form-group">
                        <label>Language Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.languageExpression || ''"
                            @update:model-value="currentElement.languageExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>
                </n-tab-pane>

                <!-- Crosstab properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'crosstab'"
                    name="crosstab"
                    :tab="'Crosstab Properties'"
                >
                    <div class="form-group">
                        <label>Crosstab Width</label>
                        <input
                            v-model.number="currentElement.crosstabWidth"
                            type="number"
                            min="0"
                            placeholder="Pixels"
                        />
                    </div>
                    <div class="form-group">
                        <label>Crosstab Height</label>
                        <input
                            v-model.number="currentElement.crosstabHeight"
                            type="number"
                            min="0"
                            placeholder="Pixels"
                        />
                    </div>
                    <div class="form-group">
                        <label>When No Data</label>
                        <select v-model="currentElement.whenNoDataType">
                            <option value="AllSectionsNoDetail">All Sections, No Detail</option>
                            <option value="AllSectionsWithDetail">All Sections With Detail</option>
                            <option value="NoDataCell">No Data Cell</option>
                            <option value="Blank">Blank</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Evaluation Time</label>
                        <select v-model="currentElement.evaluationTime">
                            <option value="Now">Now - Evaluate Immediately</option>
                            <option value="Report">Report - At Report End</option>
                            <option value="Page">Page - At Page End</option>
                            <option value="Column">Column - At Column End</option>
                            <option value="Group">Group - At Group End</option>
                            <option value="Band">Band - At Band End</option>
                            <option value="Auto">Auto - Engine Decides</option>
                            <option value="Master">Master - At Master Report End</option>
                        </select>
                    </div>
                </n-tab-pane>

                <!-- Icon label properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'iconLabel'"
                    name="iconLabel"
                    :tab="'Icon Label Properties'"
                >
                    <div class="form-group">
                        <label>Icon</label>
                        <input
                            v-model="currentElement.icon"
                            type="text"
                            placeholder="Enter an icon name or emoji, e.g.: 📊, 📊"
                        />
                    </div>
                    <div class="form-group">
                        <label>Static Label</label>
                        <input
                            v-model="currentElement.label"
                            type="text"
                            placeholder="Enter fixed label text"
                        />
                    </div>
                    <div class="form-group">
                        <label>Label Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.labelExpression || ''"
                            @update:model-value="currentElement.labelExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                        />
                    </div>
                    <div class="form-group">
                        <label>Evaluation Time</label>
                        <select v-model="currentElement.evaluationTime">
                            <option value="Now">Now - Evaluate Immediately</option>
                            <option value="Report">Report - At Report End</option>
                            <option value="Page">Page - At Page End</option>
                            <option value="Column">Column - At Column End</option>
                            <option value="Group">Group - At Group End</option>
                            <option value="Band">Band - At Band End</option>
                            <option value="Auto">Auto - Engine Decides</option>
                            <option value="Master">Master - At Master Report End</option>
                        </select>
                    </div>
                </n-tab-pane>

                <!-- Generic element properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'genericElement'"
                    name="genericElement"
                    :tab="'Generic Element Properties'"
                >
                    <div class="form-group">
                        <label>Namespace</label>
                        <input v-model="currentElement.namespace" type="text" placeholder="e.g.: http://example.com/namespace" />
                    </div>
                    <div class="form-group">
                        <label>Evaluation Time</label>
                        <select v-model="currentElement.evaluationTime">
                            <option value="Now">Now - Evaluate Immediately</option>
                            <option value="Report">Report - At Report End</option>
                            <option value="Page">Page - At Page End</option>
                            <option value="Column">Column - At Column End</option>
                            <option value="Group">Group - At Group End</option>
                            <option value="Band">Band - At Band End</option>
                            <option value="Auto">Auto - Engine Decides</option>
                            <option value="Master">Master - At Master Report End</option>
                        </select>
                    </div>
                </n-tab-pane>

                <!-- Sort properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'sort'"
                    name="sort"
                    :tab="'Sort Properties'"
                >
                    <div class="form-group">
                        <label>Sort Fields</label>
                        <div v-if="currentElement.sortFields && currentElement.sortFields.length > 0">
                            <div v-for="(field, index) in currentElement.sortFields" :key="index" class="sort-field-item">
                                <input v-model="field.name" type="text" placeholder="Field Name" class="sort-field-name" />
                                <select v-model="field.order" class="sort-field-order">
                                    <option value="Ascending">Ascending</option>
                                    <option value="Descending">Descending</option>
                                </select>
                                <button @click="removeSortField(index)" class="sort-field-remove">Delete</button>
                            </div>
                        </div>
                        <button @click="addSortField" class="add-sort-field">Add Sort Field</button>
                    </div>
                    <div class="form-group">
                        <label>Evaluation Time</label>
                        <select v-model="currentElement.evaluationTime">
                            <option value="Now">Now - Evaluate Immediately</option>
                            <option value="Report">Report - At Report End</option>
                            <option value="Page">Page - At Page End</option>
                            <option value="Column">Column - At Column End</option>
                            <option value="Group">Group - At Group End</option>
                            <option value="Band">Band - At Band End</option>
                            <option value="Auto">Auto - Engine Decides</option>
                            <option value="Master">Master - At Master Report End</option>
                        </select>
                    </div>
                </n-tab-pane>

                <!-- List properties tab -->
                <n-tab-pane
                    v-if="currentElement && currentElement.type === 'list'"
                    name="list"
                    :tab="'List Properties'"
                >
                    <div class="form-group">
                        <label>Print Order</label>
                        <select v-model="currentElement.printOrder">
                            <option value="Vertical">Vertical - Vertical</option>
                            <option value="Horizontal">Horizontal - Horizontal</option>
                        </select>
                    </div>
                    <div class="form-group" v-if="currentElement.printOrder === 'Horizontal'">
                        <label style="display: flex; align-items: center; gap: 4px;">
                            <input type="checkbox" v-model="currentElement.ignoreWidth" />
                            Ignore Width (Continue Rendering)
                        </label>
                    </div>
                    <div class="form-group">
                        <label>Sub-Dataset Name</label>
                        <input v-model="currentElement.subDataset" type="text" placeholder="e.g.: Addresses" />
                    </div>
                    <div class="form-group">
                        <label>Data Source Expression</label>
                        <ExpressionEditor
                            :model-value="currentElement.dataSourceExpression || ''"
                            @update:model-value="currentElement.dataSourceExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder='e.g.: $P{myDatasource}'
                        />
                    </div>
                    <div class="form-group">
                        <label>Connection Expression (Optional)</label>
                        <ExpressionEditor
                            :model-value="currentElement.connectionExpression || ''"
                            @update:model-value="currentElement.connectionExpression = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder='e.g.: $P{connection}'
                        />
                    </div>
                    <div class="form-group">
                        <label>List Contents Height</label>
                        <input
                            v-model.number="listContentsHeight"
                            type="number"
                            min="0"
                            placeholder="Pixels"
                            @change="updateListContentsHeight"
                        />
                    </div>
                    <div class="form-group">
                        <label>List Contents Width</label>
                        <input
                            v-model.number="listContentsWidth"
                            type="number"
                            min="0"
                            placeholder="Pixels"
                            @change="updateListContentsWidth"
                        />
                    </div>
                    <div class="form-group">
                        <label>Split Type</label>
                        <select v-model="currentElement.splitType">
                            <option value="Stretch">Stretch - Stretch</option>
                            <option value="Prevent">Prevent - Prevent Split</option>
                            <option value="Immediate">Immediate - Split Immediately</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Evaluation Time</label>
                        <select v-model="currentElement.evaluationTime">
                            <option value="Now">Now - Evaluate Immediately</option>
                            <option value="Report">Report - At Report End</option>
                            <option value="Page">Page - At Page End</option>
                            <option value="Column">Column - At Column End</option>
                            <option value="Group">Group - At Group End</option>
                            <option value="Band">Band - At Band End</option>
                            <option value="Auto">Auto - Engine Decides</option>
                        </select>
                    </div>
                    <div
                        class="form-group"
                        v-if="currentElement.evaluationTime === 'Group'"
                    >
                        <label>Evaluation Group</label>
                        <ExpressionEditor
                            :model-value="currentElement.evaluationGroup || ''"
                            @update:model-value="currentElement.evaluationGroup = $event"
                            :report-fields="reportFields"
                            :report-parameters="reportParameters"
                            :report-variables="reportVariables"
                            placeholder="Enter group name"
                        />
                    </div>
                </n-tab-pane>

            </n-tabs>

            <div class="element-actions">
                <n-button @click="deleteElement" type="error">{{
                    t("properties.deleteElement")
                }}</n-button>
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
                        <select
                            v-model="style.mode"
                            @change="emit('update-jrxml')"
                        >
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
                        <select
                            v-model="style.hTextAlign"
                            @change="emit('update-jrxml')"
                        >
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
                        <select
                            v-model="style.hImageAlign"
                            @change="emit('update-jrxml')"
                        >
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
                        <select
                            v-model="style.vTextAlign"
                            @change="emit('update-jrxml')"
                        >
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
                        <select
                            v-model="style.vImageAlign"
                            @change="emit('update-jrxml')"
                        >
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
import { computed, ref, onMounted, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { NButton, NTabs, NTabPane, NRadioGroup, NRadioButton } from "naive-ui";
import type { Band, SelectedElementInfo, TableDataset } from "../../../types";
import { getAvailableFonts } from "../../../utils/fontUtils";
import BaseModal from "../../modals/BaseModal.vue";
import ColorPickerWithOpacity from "./ColorPickerWithOpacity.vue";
import FontStyleSettings from "./FontStyleSettings.vue";
import BorderStyleSettings from "./BorderStyleSettings.vue";
import ElementTypeBasedSettings from "./ElementTypeBasedSettings.vue";
import FrameProperties from "./FrameProperties.vue";
import TableProperties from "./TableProperties.vue";
import ColumnTreeNode from "./ColumnTreeNode.vue";
import ExpressionEditor from "./common/ExpressionEditor.vue";
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
                const frame =
                    band.elements[props.selectedElement.parentFrameIndex];
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
                const frame =
                    band.elements[props.selectedElement.parentFrameIndex];
                if (frame && frame.type === "frame" && frame.elements) {
                    frame.elements[props.selectedElement.elementIndex] =
                        updatedElement;
                }
            } else {
                band.elements[props.selectedElement.elementIndex] =
                    updatedElement;
            }
            emit("update:bands", props.bands);
            emit("update-jrxml");
        }
    }
};

// Table property update handler
const handleTablePropertyUpdate = (updatedElement: any) => {
    if (currentElement.value && props.selectedElement) {
        const band = props.bands[props.selectedElement.bandIndex];
        if (band && band.elements) {
            if (props.selectedElement.parentFrameIndex !== undefined) {
                const frame =
                    band.elements[props.selectedElement.parentFrameIndex];
                if (frame && frame.type === "frame" && frame.elements) {
                    frame.elements[props.selectedElement.elementIndex] =
                        updatedElement;
                }
            } else {
                band.elements[props.selectedElement.elementIndex] =
                    updatedElement;
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
                    type: "staticText",
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 30,
                    text: `Column ${currentElement.value.columns.length + 1}`,
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
    if (!currentElement.value || currentElement.value.type !== "table")
        return [];
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
            const newCol = createDefaultColumn(
                `Column ${group.children.length + 1}`,
            );
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
                    if ('detailCell' in item) {
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
                    console.log("getBaseHeight:", { inputHeight: h, rowSpan: rs, result });
                    return result;
                };
                console.log("Watch: firstColumn.columnHeader before updating tableRowHeights:", firstColumn.columnHeader);
                const headerHeight = getBaseHeight(firstColumn.tableHeader);
                const colHeaderHeight = getBaseHeight(firstColumn.columnHeader);
                const detailHeight = getBaseHeight(firstColumn.detailCell);
                const footerHeight = getBaseHeight(firstColumn.columnFooter);
                const tableFooterHeight = getBaseHeight(firstColumn.tableFooter);

                console.log("Watch: computed heights:", { headerHeight, colHeaderHeight, detailHeight, footerHeight, tableFooterHeight });

                // Only update when a valid value was obtained, to avoid overwriting user input
                if (headerHeight !== undefined) {
                    tableRowHeights.value.tableHeader = headerHeight;
                }
                if (colHeaderHeight !== undefined) {
                    console.log("Watch: updating tableRowHeights.columnHeader:", colHeaderHeight);
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
            if ('children' in item && item.children && item.children.length > 0) {
                // It's a ColumnGroup, process recursively
                updateGroupRowHeights(item);
            } else if ('detailCell' in item) {
                // It's a TableColumn (plain column), update detailCell directly
                console.log("Updating top-level plain column detailCell:", item.name || item.uuid);
                updateColumnRowHeights(item);
            }
        });
        console.log("Grouped column row height update complete");
    }

    console.log("All column row heights updated, table element:", currentElement.value);

    // Check merged column heights before emitting
    const tableElement = currentElement.value as any;
    if (tableElement?.columns) {
        tableElement.columns.forEach((col: any) => {
            if (col.columnHeader && col.columnHeader.rowSpan && col.columnHeader.rowSpan > 1) {
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
                if (col.columnHeader && col.columnHeader.rowSpan && col.columnHeader.rowSpan > 1) {
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
                if (col.columnHeader && col.columnHeader.rowSpan && col.columnHeader.rowSpan > 1) {
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
                    if (col.columnHeader && col.columnHeader.rowSpan && col.columnHeader.rowSpan > 1) {
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

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
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

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
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
        console.log("Updating detailCell height:", tableRowHeights.value.detailCell, "column:", column);
        // Update the inner element's height directly, since detailCell directly contains a textField or staticText rather than going through an elements array
        // Check and update the reportElement's height
        if (column.detailCell.reportElement) {
            column.detailCell.reportElement.height =
                tableRowHeights.value.detailCell;
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

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
        // Check and update the reportElement's height
        if (column.columnFooter.reportElement) {
            column.columnFooter.reportElement.height = columnFooterHeight;
        } else if (column.columnFooter.element) {
            // Update the inner element's height property to keep the design area rendering in sync
            column.columnFooter.element.height = columnFooterHeight;
        }

        // If this is a merged column, update the height to the row height times the row span
        if (column.columnFooter.rowSpan && column.columnFooter.rowSpan > 1) {
            const mergedHeight =
                columnFooterHeight * column.columnFooter.rowSpan;
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

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
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

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
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

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
        // Check and update the reportElement's height
        if (group.columnHeader.reportElement) {
            group.columnHeader.reportElement.height = groupHeight;
        } else if (group.columnHeader.element) {
            // Update the inner element's height property to keep the design area rendering in sync
            group.columnHeader.element.height = groupHeight;
        }
        console.log("Updated columnHeader:", group.columnHeader);
    }

    console.log("Combined column header height update complete, updated combined column:", group);
}

// Recursively update the row heights of a group
function updateGroupRowHeights(group: any) {
    // Update the group's tableHeader height
    if (group.tableHeader) {
        // Update the tableHeader's own height
        const tableHeaderHeight = tableRowHeights.value.tableHeader;
        group.tableHeader.height = tableHeaderHeight;

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
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

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
        // Check and update the reportElement's height
        if (group.columnHeader.reportElement) {
            group.columnHeader.reportElement.height = columnHeaderHeight;
        } else if (group.columnHeader.element) {
            // Update the inner element's height property to keep the design area rendering in sync
            group.columnHeader.element.height = columnHeaderHeight;
        }

        // If this is a merged column, update the height to the row height times the row span
        if (group.columnHeader.rowSpan && group.columnHeader.rowSpan > 1) {
            const mergedHeight =
                columnHeaderHeight * group.columnHeader.rowSpan;
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

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
        // Check and update the reportElement's height
        if (group.columnFooter.reportElement) {
            group.columnFooter.reportElement.height = columnFooterHeight;
        } else if (group.columnFooter.element) {
            // Update the inner element's height property to keep the design area rendering in sync
            group.columnFooter.element.height = columnFooterHeight;
        }

        // If this is a merged column, update the height to the row height times the row span
        if (group.columnFooter.rowSpan && group.columnFooter.rowSpan > 1) {
            const mergedHeight =
                columnFooterHeight * group.columnFooter.rowSpan;
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

        // Update the inner element's height directly, since these elements directly contain a textField or staticText rather than going through an elements array
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
                childType: child.children ? 'group' : 'column'
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
function updateBandHeight(_index: number) {
    const updatedBands = [...props.bands];
    emit("save-state");
    emit("update:bands", updatedBands);
    emit("update-jrxml");
}

// Ensure the coordinate value is an integer
function ensureIntegerValue(element: any, property: string) {
    if (element[property] !== undefined) {
        element[property] = Math.round(element[property]);
    }
    emit("save-state");
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

function setSideBorderWidth(side: string, value: string) {
    if (!currentElement.value?.box) return;
    const numValue = parseFloat(value) || 0;
    const widthKey = `${side}BorderWidth`;
    const penKey = `${side}Pen`;
    emit("save-state");
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
    return "";
}

function setSideBorderStyle(side: string, value: string) {
    if (!currentElement.value?.box) return;
    const box = currentElement.value.box;
    const styleKey = `${side}BorderStyle`;
    const penKey = `${side}Pen`;
    emit("save-state");

    // Set the border style
    box[styleKey] = value;
    if (!box[penKey]) {
        box[penKey] = {};
    }
    box[penKey].lineStyle = value;

    // Automatically adjust the border width based on the style
    if (value && value !== "") {
        // Not the "None" style; if the width is 0, default it to 1
        if (!box[penKey].lineWidth || box[penKey].lineWidth <= 0) {
            box[penKey].lineWidth = 1;
            const widthKey = `${side}BorderWidth`;
            box[widthKey] = 1;
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

function setSideBorderColor(side: string, value: string) {
    if (!currentElement.value?.box) return;
    const box = currentElement.value.box;
    const colorKey = `${side}BorderColor`;
    const penKey = `${side}Pen`;
    emit("save-state");
    box[colorKey] = value;
    if (!box[penKey]) {
        box[penKey] = {};
    }
    box[penKey].lineColor = value;
    emit("update-jrxml");
}

// Functions related to the unified four-side setting
function getUnifiedBorderStyle(): string {
    if (!currentElement.value?.box) return "";
    // Check whether all sides have the same style
    const sides = ["top", "left", "bottom", "right"];
    const styles = sides.map((side) => getSideBorderStyle(side));
    const firstStyle = styles[0];
    if (styles.every((style) => style === firstStyle)) {
        return firstStyle || "";
    }
    return "";
}

function setUnifiedBorderStyle(value: string) {
    if (!currentElement.value?.box) return;
    emit("save-state");
    const sides = ["top", "left", "bottom", "right"];
    sides.forEach((side) => {
        setSideBorderStyle(side, value);
    });
    emit("update-jrxml");
}

function getUnifiedBorderWidth(): number {
    if (!currentElement.value?.box) return 0;
    // Check whether all sides have the same width
    const sides = ["top", "left", "bottom", "right"];
    const widths = sides.map((side) => getSideBorderWidth(side));
    const firstWidth = widths[0];
    if (widths.every((width) => width === firstWidth)) {
        return firstWidth || 0;
    }
    return 0;
}

function setUnifiedBorderWidth(value: string) {
    if (!currentElement.value?.box) return;
    const numValue = parseFloat(value) || 0;
    emit("save-state");
    const sides = ["top", "left", "bottom", "right"];
    sides.forEach((side) => {
        setSideBorderWidth(side, value);
    });
    emit("update-jrxml");
}

function getUnifiedBorderColor(): string {
    if (!currentElement.value?.box) return "#000000";
    // Check whether all sides have the same color
    const sides = ["top", "left", "bottom", "right"];
    const colors = sides.map((side) => getSideBorderColor(side));
    const firstColor = colors[0];
    if (colors.every((color) => color === firstColor)) {
        return firstColor || "#000000";
    }
    return "#000000";
}

function setUnifiedBorderColor(value: string) {
    if (!currentElement.value?.box) return;
    emit("save-state");
    const sides = ["top", "left", "bottom", "right"];
    sides.forEach((side) => {
        setSideBorderColor(side, value);
    });
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

            // If childColumn has a columnHeader and it is of type staticText, also update its text content
            if (
                childColumn.columnHeader &&
                childColumn.columnHeader.type === "staticText"
            ) {
                childColumn.columnHeader.text = newName;
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

    const newText = column.tableHeader.text;

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
        if (
            childColumn &&
            childColumn.hasTableHeader &&
            childColumn.tableHeader
        ) {
            // Update childColumn's table header text
            childColumn.tableHeader.text = newText;
        }
    }
}

// Update the field expression, also updating the corresponding column's field expression within children
function updateFieldExpression(column: any, index: number) {
    if (!column || !currentElement || !column.detailCell) return;

    const newExpression = column.detailCell.expression;

    // If detailCell is of type staticText, convert it to a textField type
    if (column.detailCell.type === "staticText") {
        // Preserve the original properties
        const {
            x,
            y,
            width,
            height,
            textAlignment,
            verticalAlignment,
            fontSize,
            isBold,
            isItalic,
            isUnderline,
            fontFamily,
            backcolor,
            mode,
            box,
        } = column.detailCell;
        // Convert to a textField type
        column.detailCell = {
            type: "textField",
            x,
            y,
            width,
            height,
            expression: newExpression,
            textAlignment,
            verticalAlignment,
            fontSize,
            isBold,
            isItalic,
            isUnderline,
            fontFamily,
            backcolor,
            mode,
            box,
            textAdjust: "CutText",
            isBlankWhenNull: true,
        };
    }

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
            // If childColumn's detailCell is of type staticText, convert it to a textField type
            if (childColumn.detailCell.type === "staticText") {
                // Preserve the original properties
                const {
                    x,
                    y,
                    width,
                    height,
                    textAlignment,
                    verticalAlignment,
                    fontSize,
                    isBold,
                    isItalic,
                    isUnderline,
                    fontFamily,
                    backcolor,
                    mode,
                    box,
                } = childColumn.detailCell;
                // Convert to a textField type
                childColumn.detailCell = {
                    type: "textField",
                    x,
                    y,
                    width,
                    height,
                    expression: newExpression,
                    textAlignment,
                    verticalAlignment,
                    fontSize,
                    isBold,
                    isItalic,
                    isUnderline,
                    fontFamily,
                    backcolor,
                    mode,
                    box,
                    textAdjust: "CutText",
                    isBlankWhenNull: true,
                };
            } else {
                // Update childColumn's field expression
                childColumn.detailCell.expression = newExpression;
            }
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
                type: "staticText",
                x: 0,
                y: 0,
                width: column.width,
                height: 30,
                text: column.name,
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
                    const match =
                        column.detailCell.expression.match(/\$F\{([^}]+)\}/);
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
                        type: "staticText",
                        x: 0,
                        y: 0,
                        width: columnWidth,
                        height: 30,
                        text: fieldName,
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
                        type: "staticText",
                        x: 0,
                        y: 0,
                        width: columnWidth,
                        height: 30,
                        text: fieldName,
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
    if (!el?.pen) return 1;
    return el.pen.lineWidth || 0;
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
    emit("update-jrxml");
}

function getRectangleBorderStyle(): string {
    const el = currentElement.value as any;
    if (!el?.pen) return "Solid";
    return el.pen.lineStyle || "Solid";
}

function setRectangleBorderStyle(value: string) {
    if (!currentElement.value) return;
    const el = currentElement.value as any;
    emit("save-state");
    if (!el.pen) {
        el.pen = {};
    }
    el.pen.lineStyle = value;
    emit("update-jrxml");
}

function getRectangleBorderColor(): string {
    const el = currentElement.value as any;
    if (!el?.pen) return "#000000";
    return el.pen.lineColor || "#000000";
}

function setRectangleBorderColor(value: string) {
    if (!currentElement.value) return;
    const el = currentElement.value as any;
    emit("save-state");
    if (!el.pen) {
        el.pen = {};
    }
    el.pen.lineColor = value;
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

// Sort field management
function addSortField() {
    if (!currentElement.value || currentElement.value.type !== "sort") return;
    if (!currentElement.value.sortFields) {
        currentElement.value.sortFields = [];
    }
    currentElement.value.sortFields.push({
        name: "",
        order: "Ascending",
    });
    emit("update-jrxml");
}

function removeSortField(index: number) {
    if (!currentElement.value || currentElement.value.type !== "sort") return;
    if (!currentElement.value.sortFields) return;
    currentElement.value.sortFields.splice(index, 1);
    emit("update-jrxml");
}

// List contents height
const listContentsHeight = ref(0);
const listContentsWidth = ref(0);

// Sync the list contents height to currentElement
watch(
    () => currentElement.value,
    (el) => {
        if (el && el.type === "list" && el.listContents) {
            listContentsHeight.value = el.listContents.height || 0;
            listContentsWidth.value = el.listContents.width || 0;
        }
    },
    { immediate: true },
);

function updateListContentsHeight() {
    if (!currentElement.value || currentElement.value.type !== "list") return;
    if (!currentElement.value.listContents) {
        currentElement.value.listContents = {
            elements: [],
            height: 0,
            width: 0,
        };
    }
    currentElement.value.listContents.height = listContentsHeight.value;
    emit("update-jrxml");
}

function updateListContentsWidth() {
    if (!currentElement.value || currentElement.value.type !== "list") return;
    if (!currentElement.value.listContents) {
        currentElement.value.listContents = {
            elements: [],
            height: 0,
            width: 0,
        };
    }
    currentElement.value.listContents.width = listContentsWidth.value;
    emit("update-jrxml");
}

function addProperty() {
    if (!currentElement.value) return;
    if (!currentElement.value.properties) {
        (currentElement.value as any).properties = [];
    }
    (currentElement.value as any).properties.push({ name: '', value: '' });
    emit("update-jrxml");
}

function addPropertyExpression() {
    if (!currentElement.value) return;
    if (!currentElement.value.propertyExpressions) {
        (currentElement.value as any).propertyExpressions = [];
    }
    (currentElement.value as any).propertyExpressions.push({ name: '', valueExpression: '' });
    emit("update-jrxml");
}
</script>

<style scoped>
.element-properties {
    padding: var(--prop-spacing-md);
}

.element-properties h3 {
    margin: 0 0 var(--prop-spacing-md) 0;
    padding: 0 0 var(--prop-spacing-xs) 0;
    font-size: var(--prop-font-size-md);
    font-weight: var(--prop-font-weight-semibold);
    color: var(--prop-text-primary);
    border-bottom: 1px solid var(--prop-divider-color);
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

.band-heights-grid {
    display: grid;
    gap: var(--prop-spacing-sm);
}

.band-height-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.band-height-control {
    display: flex;
    align-items: center;
    gap: var(--prop-spacing-xs);
}

.band-height-input {
    width: 80px;
}

.band-height-unit {
    font-size: var(--prop-font-size-sm);
    color: var(--prop-text-tertiary);
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
    gap: var(--prop-spacing-sm);
}

.border-side-item {
    display: flex;
    align-items: flex-start;
    gap: var(--prop-spacing-sm);
}

.border-side-controls {
    flex: 1;
    display: flex;
    gap: var(--prop-spacing-sm);
    align-items: center;
    flex-wrap: wrap;
}

.border-side-group {
    display: flex;
    align-items: center;
    gap: var(--prop-spacing-sm);
    margin-bottom: var(--prop-spacing-sm);
    flex-wrap: wrap;
}

.side-label {
    width: 20px;
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
    width: 50px;
    height: 24px;
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
    height: 24px;
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
    margin-top: var(--prop-spacing-xl);
    padding-top: var(--prop-spacing-lg);
    border-top: 1px solid var(--prop-divider-color);
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

@media (max-width: 768px) {
    .style-properties {
        grid-template-columns: 1fr;
    }
}
</style>
