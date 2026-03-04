<template>
    <div class="flex flex-col h-screen bg-base-200">
        <!-- Header -->
        <header class="bg-base-100 border-b border-base-300 px-6 py-4 flex items-baseline gap-x-4">
            <h1 class="text-2xl font-bold text-base-content">
                Batch-Anonymisierung
            </h1>
            <p class="text-sm text-base-content/60 mt-1">
                Mehrere Dateien nacheinander anonymisieren
            </p>
        </header>

        <!-- Status Banner -->
        <div v-if="modelStatus !== 'ready'" class="bg-info text-info-content px-6 py-3">
            <div class="flex items-center gap-3">
                <span v-if="modelStatus === 'loading'" class="loading loading-spinner loading-sm"></span>
                <span v-else-if="modelStatus === 'error'" class="text-error text-xl">!</span>
                <div class="flex-1">
                    <template v-if="modelStatus === 'idle'">
                        <strong>Modell wird vorbereitet...</strong>
                    </template>
                    <template v-else-if="modelStatus === 'loading'">
                        <strong>Modell wird geladen...</strong> {{ modelProgress }}%
                        <div class="w-full bg-info/20 rounded-full h-2 mt-1">
                            <div class="bg-white h-2 rounded-full transition-all" :style="{ width: modelProgress + '%' }"></div>
                        </div>
                    </template>
                    <template v-else-if="modelStatus === 'error'">
                        <strong class="text-error">Fehler:</strong> {{ modelError }}
                    </template>
                </div>
            </div>
        </div>

        <!-- Main Content: 3 Columns -->
        <main class="flex-1 flex overflow-hidden">
            <!-- LEFT: File Input -->
            <section
                class="border-r border-base-300 bg-base-100 flex flex-col flex-shrink-0"
                :style="{ width: leftPanelWidth + 'px' }"
            >
                <div class="p-4 border-b border-base-300">
                    <h2 class="font-semibold text-lg flex items-center gap-2">
                        <FolderIcon class="w-5 h-5" />
                        Eingabe-Dateien
                    </h2>
                </div>

                <!-- Drop Zone -->
                <div
                    class="m-4 border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer"
                    :class="dragOver ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary/50'"
                    @click="triggerFileInput"
                    @drop.prevent="handleFileDrop"
                    @dragover.prevent="dragOver = true"
                    @dragleave.prevent="dragOver = false"
                >
                    <ArrowUpTrayIcon class="w-10 h-10 mx-auto text-base-content/40 mb-2" />
                    <p class="text-sm text-base-content/60">
                        Dateien hierher ziehen<br>
                        oder klicken zum Auswählen
                    </p>
                    <p class="text-xs text-base-content/40 mt-2">
                        TXT, PDF, DOCX
                    </p>
                </div>

                <input
                    ref="fileInput"
                    type="file"
                    multiple
                    accept=".txt,.pdf,.docx,.doc"
                    class="hidden"
                    @change="handleFileSelect"
                >

                <!-- Folder Select Button -->
                <div class="px-4 pb-4">
                    <button @click="triggerFolderInput" class="btn btn-outline btn-sm w-full">
                        <FolderOpenIcon class="w-4 h-4 mr-2" />
                        Ordner auswählen
                    </button>
                    <input
                        ref="folderInput"
                        type="file"
                        webkitdirectory
                        directory
                        multiple
                        class="hidden"
                        @change="handleFolderSelect"
                    >
                </div>

                <!-- File List -->
                <div class="flex-1 overflow-y-auto px-4 pb-4">
                    <div v-if="inputFiles.length === 0" class="text-center text-base-content/40 py-8">
                        Keine Dateien ausgewählt
                    </div>
                    <ul v-else class="space-y-2">
                        <li
                            v-for="(file, index) in inputFiles"
                            :key="index"
                            class="relative"
                            @mouseenter="hoveredFileIndex = index"
                            @mouseleave="hoveredFileIndex = null"
                        >
                            <div class="flex items-center gap-2 p-2 bg-base-200 rounded text-sm min-h-[40px]">
                                <DocumentIcon class="w-4 h-4 flex-shrink-0 text-base-content/60" />
                                <span class="flex-1 truncate select-none" :title="file.relativePath || file.name">
                                    {{ file.relativePath || file.name }}
                                </span>
                                
                                <!-- Test Button (inline) -->
                                <button
                                    v-if="(hoveredFileIndex === index || (testPreviewLoading && testPreviewFile === file)) && modelStatus === 'ready'"
                                    @click.stop="testAnonymization(file, false)"
                                    class="btn btn-xs btn-square btn-primary animate-fadeIn"
                                    :disabled="testPreviewLoading"
                                    title="Anonymisierung testen (ca. 2000 Zeichen)"
                                >
                                    <template v-if="testPreviewLoading && testPreviewFile === file && !isFullTest">
                                        <span class="loading loading-spinner loading-xs"></span>
                                    </template>
                                    <template v-else>
                                        <MagnifyingGlassIcon class="w-4 h-4" />
                                    </template>
                                </button>
                                <button
                                    v-if="(hoveredFileIndex === index || (testPreviewLoading && testPreviewFile === file)) && modelStatus === 'ready'"
                                    @click.stop="testAnonymization(file, true)"
                                    class="btn btn-xs btn-square btn-outline btn-primary animate-fadeIn ml-1"
                                    :disabled="testPreviewLoading"
                                    title="Datei komplett anonymisieren und prüfen"
                                >
                                    <template v-if="testPreviewLoading && testPreviewFile === file && isFullTest">
                                        <span class="loading loading-spinner loading-xs"></span>
                                    </template>
                                    <template v-else>
                                        <DocumentCheckIcon class="w-4 h-4" />
                                    </template>
                                </button>

                                <button
                                    @click="removeInputFile(index)"
                                    class="btn btn-ghost btn-xs btn-square text-error"
                                    title="Datei entfernen"
                                >
                                    <XMarkIcon class="w-4 h-4" />
                                </button>
                            </div>
                        </li>
                    </ul>
                </div>

                <!-- File Options -->
                <div class="p-4 border-t border-base-300 bg-base-200/30">
                    <div class="flex items-center gap-2 mb-2">
                        <DocumentIcon class="w-4 h-4 text-base-content/60" />
                        <h3 class="font-bold text-xs uppercase tracking-wider text-base-content/60">Datei-Optionen</h3>
                    </div>
                    <div class="form-control space-y-2">
                        <label class="label cursor-pointer justify-start gap-2 p-0">
                            <input
                                type="checkbox"
                                v-model="courtStyle"
                                class="checkbox checkbox-xs checkbox-primary"
                            >
                            <span class="label-text text-xs font-semibold">Gerichtsübliche Anonymisierung (A.________)</span>
                        </label>
                        <label class="label cursor-pointer justify-start gap-2 p-0">
                            <input
                                type="checkbox"
                                v-model="convertWordToMarkdown"
                                class="checkbox checkbox-xs checkbox-primary"
                            >
                            <span class="label-text text-xs font-semibold">Word (.docx) als Markdown</span>
                        </label>
                        <p class="text-[10px] leading-tight text-base-content/50 ml-5 mt-1">
                            Behält Formatierung (Fett, Listen, etc.) bei.
                        </p>
                    </div>
                </div>

                <!-- Clear All Button -->
                <div v-if="inputFiles.length > 0" class="p-4 border-t border-base-300">
                    <button @click="clearInputFiles" class="btn btn-ghost btn-sm w-full text-error">
                        Alle entfernen
                    </button>
                </div>
            </section>

            <!-- Resize Handle Left -->
            <div
                class="w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors flex-shrink-0"
                @mousedown="startResizeLeft"
            ></div>

            <!-- CENTER: Entity Selection -->
            <section
                class="border-r border-base-300 bg-base-100 flex flex-col flex-shrink-0"
                :style="{ width: centerPanelWidth + 'px' }"
            >
                <div class="p-4 border-b border-base-300">
                    <h2 class="font-semibold text-lg flex items-center gap-2">
                        <Cog6ToothIcon class="w-5 h-5" />
                         Anonymisierungseinstellungen
                    </h2>
                </div>

                <!-- Scrollable Settings Area -->
                <div class="flex-1 overflow-y-auto">

                <!-- Group 1: Detection Settings -->
                <div class="px-4 pb-1 pt-2 flex items-center gap-2">
                    <MagnifyingGlassIcon class="w-4 h-4" />
                    <h3 class="font-bold text-sm">Einstellungen für die automatische Erkennung von PII-Entitäten (persönlich identifizierbare Information)</h3>
                </div>
                <div class="p-4 border-b border-base-300 space-y-4">
                    <div class="border border-base-300 rounded-lg overflow-hidden">
                        <!-- Threshold Control -->
                        <div class="px-4 pt-4 pb-2 bg-base-100/50">
                            <label class="label pb-1 cursor-pointer">
                                <div class="flex items-center gap-2">
                                    <SignalIcon class="w-4 h-4" />
                                    <span class="label-text text-xs font-semibold">Anonymisierungsstärke (1 - Threshold)</span>
                                </div>
                                <span class="label-text-alt font-mono">{{ anonymizationStrength }}</span>
                            </label>
                            <input
                                type="range"
                                min="0.2"
                                max="0.95"
                                step="0.05"
                                v-model.number="anonymizationStrength"
                                class="range range-xs range-primary"
                            />
                            <div class="w-full flex justify-between text-[10px] px-1 text-base-content/50">
                                <span>weniger (lasch)</span>
                                <span>mehr (aggressiv)</span>
                            </div>
                            <p class="text-[10px] text-base-content/40 mt-1 px-1">
                                Ein hoher Wert bedeutet Über-Anonymisierung (viele false Positive Fehler: Es werden Entitäten anonymiisert, die keine PII enthalten).
                                Ein niedriger Wert bedeutet Unter-Anonymisierung (viele false Negative Fehler: Es werden Entitäten nicht anonymisiert, die PII enthalten).
                            </p>
                        </div>

                        <!-- Entity Selection Header -->
                        <div class="px-4 pt-4 pb-1">
                        <div class="flex items-center gap-2 mb-2">
                            <TagIcon class="w-3 h-3" />
                            <span class="label-text text-xs font-semibold">zu anonymisierende Kategorien</span>
                        </div>
                            
                            <!-- Quick Select Buttons -->
                            <div class="flex gap-2 flex-wrap mb-2">
                                <button @click="selectAllLabels" class="btn btn-xs btn-outline">Alle</button>
                                <button @click="selectCommonLabels" class="btn btn-xs btn-outline">Häufige</button>
                                <button @click="deselectAllLabels" class="btn btn-xs btn-outline">Keine</button>
                            </div>
                        </div>

                        <!-- Entity Checkboxes -->
                        <div class="h-48 overflow-y-auto px-4 pb-4 bg-base-100">
                            <div class="space-y-1">
                                <label
                                    v-for="label in availableLabels"
                                    :key="label"
                                    class="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        :value="label"
                                        v-model="selectedLabels"
                                        class="checkbox checkbox-sm checkbox-primary"
                                    >
                                    <span class="text-sm capitalize">{{ formatLabel(label) }}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Group 2: Partial Anonymization Options -->
                <div class="px-4 pb-1 pt-2 flex items-center gap-2">
                    <AdjustmentsHorizontalIcon class="w-4 h-4" />
                    <h3 class="font-bold text-sm">Handhabung von alleinstehenden Entitätsbestandteilen.</h3>
                </div>
                <p class="text-xs text-base-content/50 ml-6 mt-1">
                                Entitäten können aus mehreren Bestandteilen bestehen, welche im Text einzeln vorkommen können. "Vater", "von", "Max" sind die Bestandteile der erkannten PII-Entität "Vater von Max"
                            </p>
                <div class="px-4 pb-4">
                     <div class="border border-base-300 rounded-lg p-3 space-y-2">
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-2 p-0">
                                <input
                                    type="checkbox"
                                    v-model="anonymizePartialWords"
                                    class="checkbox checkbox-sm checkbox-primary"
                                >
                                <span class="label-text text-sm font-semibold">Einzelne Wörter (Entitätsbestandteile) anonymisieren</span>
                            </label>
                            <p class="text-xs text-base-content/50 ml-6 mt-1">
                                Wenn deaktiviert, werden nur vollständige Entitäten ersetzt
                            </p>
                        </div>

                        <div class="form-control">
                            <label class="label p-0 py-1">
                                <span class="label-text text-sm">Minimale Zeichenlänge für die Anonymisierung von alleinstehenden Entitätsbestandteilen</span>
                            </label>
                            <input
                                type="number"
                                v-model.number="minCharacterThreshold"
                                min="0"
                                max="50"
                                class="input input-sm input-bordered w-full"
                                placeholder="0 = keine Beschränkung"
                                :disabled="!anonymizePartialWords"
                                :class="{ 'opacity-50': !anonymizePartialWords }"
                            >
                            <p class="text-xs text-base-content/50 mt-1">
                                Entitätsbestandteile mit weniger Zeichen werden nicht anonymisiert (Bei Wert 2 wird z.B. eine alleinstehende "5" nicht anonymisiert, wenn "Landenbergstrasse 5" als PII-Entität erkannt wird)
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Group 3: Exclusion List -->
                <div class="px-4 pb-1 pt-2 flex items-center gap-2">
                    <NoSymbolIcon class="w-4 h-4" />
                    <h3 class="font-bold text-sm">Negativliste (Entitätsbestandteile, die trotz [fehlerhafter] Erkennung als Entität nie anonymisiert werden)</h3>
                </div>
                <div class="px-4 pb-4">
                    <div class="border border-base-300 rounded-lg p-3">
                        <div class="form-control">
                            <textarea
                                v-model="exclusionList"
                                @input="saveExclusionList"
                                class="textarea textarea-sm textarea-bordered w-full h-24 text-xs leading-relaxed"
                                placeholder="Wörter durch Komma trennen, z.B.: Berlin, Deutschland, Max"
                            ></textarea>
                            <div class="flex flex-wrap justify-between items-center mt-1 gap-2">
                                <p class="text-xs text-base-content/50">
                                    Diese Wörter werden nie anonymisiert
                                </p>
                                <div class="flex gap-2">
                                    <button 
                                        v-if="isCustomExclusionList" 
                                        @click="mergeDefaultExclusionList" 
                                        class="btn btn-xs btn-outline btn-info"
                                        title="Fügt fehlende Wörter aus der Standard-Liste hinzu"
                                    >
                                        + Standard
                                    </button>
                                    <button 
                                        v-if="isCustomExclusionList" 
                                        @click="resetExclusionList" 
                                        class="btn btn-xs btn-outline btn-error"
                                        title="Setzt die Liste auf den Standard zurück (löscht eigene Änderungen)"
                                    >
                                        Zurücksetzen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>

                <!-- Start Processing Button -->
                <div class="p-4 border-t border-base-300">
                    <button
                        @click="startProcessing"
                        :disabled="!canStartProcessing"
                        class="btn btn-primary w-full"
                        :class="{ 'btn-disabled': !canStartProcessing }"
                    >
                        <template v-if="isProcessing">
                            <span class="loading loading-spinner loading-sm mr-2"></span>
                            Verarbeitung läuft...
                        </template>
                        <template v-else>
                            <PlayIcon class="w-5 h-5 mr-2" />
                            Verarbeitung starten
                        </template>
                    </button>
                    <p class="text-xs text-base-content/50 mt-2 text-center">
                        {{ inputFiles.length }} Datei(en) · {{ selectedLabels.length }} Entität(en)
                    </p>
                </div>
            </section>

            <!-- Resize Handle Center -->
            <div
                class="w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors flex-shrink-0"
                @mousedown="startResizeCenter"
            ></div>

            <!-- RIGHT: Output Files -->
            <section class="flex-1 bg-base-100 flex flex-col">
                <div class="p-4 border-b border-base-300 flex justify-between items-center">
                    <h2 class="font-semibold text-lg flex items-center gap-2">
                        <DocumentCheckIcon class="w-5 h-5" />
                        Anonymisierte Dateien
                    </h2>
                    <button
                        v-if="outputFiles.length > 0"
                        @click="downloadAllAsZip"
                        class="btn btn-success btn-sm"
                    >
                        <ArrowDownTrayIcon class="w-4 h-4 mr-2" />
                        Alle herunterladen (ZIP)
                    </button>
                </div>

                <!-- Processing Progress -->
                <div v-if="isProcessing" class="p-4 border-b border-base-300 bg-warning/10">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="loading loading-spinner loading-sm text-warning"></span>
                        <span class="font-medium">{{ currentProcessingFile }}</span>
                    </div>
                    <div class="w-full bg-base-300 rounded-full h-2">
                        <div
                            class="bg-warning h-2 rounded-full transition-all"
                            :style="{ width: processingProgress + '%' }"
                        ></div>
                    </div>
                    <p class="text-xs text-base-content/60 mt-1">
                        {{ processedCount }} / {{ inputFiles.length }} Dateien verarbeitet
                    </p>
                </div>

                <!-- Output File List -->
                <div class="flex-1 overflow-y-auto p-4">
                    <div v-if="outputFiles.length === 0 && !isProcessing" class="text-center text-base-content/40 py-16">
                        <DocumentIcon class="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>Noch keine Dateien verarbeitet</p>
                        <p class="text-sm mt-1">Wählen Sie Dateien aus und starten Sie die Verarbeitung</p>
                    </div>
                    <ul v-else class="space-y-2">
                        <li
                            v-for="(file, index) in outputFiles"
                            :key="index"
                            class="flex items-center gap-3 p-3 rounded-lg"
                            :class="file.status === 'completed' ? 'bg-success/10' : file.status === 'error' ? 'bg-error/10' : 'bg-base-200'"
                        >
                            <!-- Status Icon -->
                            <div class="flex-shrink-0">
                                <CheckCircleIcon v-if="file.status === 'completed'" class="w-6 h-6 text-success" />
                                <ExclamationCircleIcon v-else-if="file.status === 'error'" class="w-6 h-6 text-error" />
                                <span v-else-if="file.status === 'processing'" class="loading loading-spinner loading-sm"></span>
                                <ClockIcon v-else class="w-6 h-6 text-base-content/40" />
                            </div>

                            <!-- File Info -->
                            <div class="flex-1 min-w-0">
                                <p class="font-medium truncate" :title="file.outputName">
                                    {{ file.outputName }}
                                </p>
                                <p class="text-xs text-base-content/60">
                                    <template v-if="file.status === 'completed'">
                                        {{ file.entitiesFound }} Entitäten gefunden
                                    </template>
                                    <template v-else-if="file.status === 'error'">
                                        {{ file.error }}
                                    </template>
                                    <template v-else-if="file.status === 'processing'">
                                        Wird verarbeitet...
                                    </template>
                                    <template v-else>
                                        Wartend
                                    </template>
                                </p>
                            </div>

                            <!-- Download Button -->
                            <button
                                v-if="file.status === 'completed'"
                                @click="downloadFile(file)"
                                class="btn btn-ghost btn-sm btn-square"
                                title="Herunterladen"
                            >
                                <ArrowDownTrayIcon class="w-5 h-5" />
                            </button>
                        </li>
                    </ul>
                </div>
            </section>
        </main>

        <!-- Test Preview Modal -->
        <div
            v-if="showTestModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            @click.self="closeTestModal"
        >
            <div class="bg-base-100 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
                <!-- Modal Header -->
                <div class="px-6 py-4 border-b border-base-300 flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-semibold">Test-Vorschau: Anonymisierung</h3>
                        <p class="text-sm text-base-content/60">
                            {{ testPreviewFile?.relativePath || testPreviewFile?.name }}
                            <span v-if="testPreviewResult" class="ml-2">
                                ({{ testPreviewResult.wordCount }} von {{ testPreviewResult.totalWords }} Wörtern)
                            </span>
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                         <button
                            v-if="testPreviewResult"
                            @click="downloadTestResult"
                            class="btn btn-ghost btn-sm"
                            title="Anonymisierten Text herunterladen"
                        >
                            <ArrowDownTrayIcon class="w-5 h-5 mr-2" />
                            Download
                        </button>
                        <button @click="closeTestModal" class="btn btn-ghost btn-sm btn-square">
                            <XMarkIcon class="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="px-6 py-4 overflow-y-auto flex-1">
                    <!-- Loading State -->
                    <div v-if="testPreviewLoading" class="flex items-center justify-center py-12">
                        <span class="loading loading-spinner loading-lg text-primary"></span>
                        <span class="ml-3 text-base-content/60">Anonymisiere Text...</span>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="testPreviewError" class="alert alert-error">
                        <ExclamationCircleIcon class="w-6 h-6" />
                        <span>Fehler: {{ testPreviewError }}</span>
                    </div>

                    <!-- Result -->
                    <div v-else-if="testPreviewResult">
                        <!-- Statistics -->
                        <div class="mb-4 p-3 bg-base-200 rounded-lg flex flex-wrap gap-4 text-sm">
                            <!-- 1. Total Entities -->
                            <span>
                                <strong class="text-primary">{{ testPreviewResult.entities.length }}</strong> Entitäten gefunden
                            </span>
                            <span class="text-base-content/40">|</span>
                            
                            <!-- 2. Labels -->
                            <span>Labels: <strong>{{ selectedLabels.length }}</strong></span>
                            <span class="text-base-content/40">|</span>

                            <!-- 3. Einzelne Wörter -->
                            <span>
                                Einzelne Wörter: 
                                <strong :class="anonymizePartialWords ? 'text-success' : 'text-base-content/60'">
                                    {{ anonymizePartialWords ? 'An' : 'Aus' }}
                                </strong>
                            </span>
                            <span class="text-base-content/40">|</span>

                            <!-- 4. Min. Zeichen -->
                            <span>
                                Min. Zeichen: <strong>{{ minCharacterThreshold }}</strong>
                                <span v-if="testPreviewResult.skippedShortEntitiesCount > 0" class="text-warning ml-1">
                                    ({{ testPreviewResult.skippedShortEntitiesCount }} übersprungen)
                                </span>
                            </span>

                            <!-- 5. Negativliste -->
                            <template v-if="testPreviewResult.exclusionListCount > 0">
                                <span class="text-base-content/40">|</span>
                                <span :title="'Negativliste: ' + exclusionList">
                                    Negativliste: <strong class="text-warning">{{ testPreviewResult.exclusionListCount }}</strong> Wörter
                                    <span v-if="testPreviewResult.excludedEntitiesCount > 0" class="text-success">
                                        ({{ testPreviewResult.excludedEntitiesCount }} übersprungen)
                                    </span>
                                </span>
                            </template>
                        </div>

                        <!-- Anonymized Text with Highlighting -->
                        <div
                            class="p-4 border border-base-300 rounded-lg bg-base-200/50
                                   whitespace-pre-wrap font-mono text-sm leading-relaxed max-h-96 overflow-y-auto cursor-text [&_p]:mb-4 [&_h1]:mb-4 [&_h2]:mb-4 [&_h3]:mb-4 [&_ul]:mb-4 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:ml-4 [&_ol]:list-decimal"
                            v-html="highlightedAnonymizedText"
                            @mouseover="handleTextMouseOver"
                            @mouseout="handleTextMouseOut"
                            @mousemove="handleTextMouseMove"
                        ></div>

                        <!-- Custom Tooltip -->
                        <div
                            v-if="hoverTooltip.visible"
                            class="fixed z-[100] px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
                            :style="{ top: (hoverTooltip.y - 8) + 'px', left: hoverTooltip.x + 'px' }"
                        >
                            Original: <span class="font-bold" v-html="hoverTooltip.text"></span>
                        </div>

                        <!-- Legend -->
                        <div class="mt-4 flex gap-2 flex-wrap text-xs items-center">
                            <span class="font-medium text-base-content/60 mr-2">Legende:</span>
                            <span class="px-2 py-1 bg-yellow-200 text-yellow-900 rounded">person</span>
                            <span class="px-2 py-1 bg-blue-200 text-blue-900 rounded">email</span>
                            <span class="px-2 py-1 bg-green-200 text-green-900 rounded">phone</span>
                            <span class="px-2 py-1 bg-purple-200 text-purple-900 rounded">address</span>
                            <span class="px-2 py-1 bg-red-200 text-red-900 rounded">iban/kreditkarte</span>
                            <span class="px-2 py-1 bg-pink-200 text-pink-900 rounded">organisation</span>
                            <span class="px-2 py-1 bg-teal-200 text-teal-900 rounded">ort</span>
                            <span class="px-2 py-1 bg-orange-200 text-orange-900 rounded">andere</span>
                            <span class="text-base-content/40 ml-2 italic">Hover zeigt Original</span>
                        </div>

                        <!-- Anonymized Words List - Click to exclude -->
                        <div class="mt-6 p-4 bg-base-200 rounded-lg">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-semibold text-sm">Anonymisierte Wörter</h4>
                                <span class="text-xs text-base-content/60">
                                    Klicken um zur Negativliste hinzuzufügen
                                </span>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <button
                                    v-for="item in uniqueAnonymizedWords"
                                    :key="item.word"
                                    @click="addToExclusionList(item.word)"
                                    class="px-2 py-1 text-xs rounded-full border transition-all"
                                    :class="item.isInExclusionList
                                        ? 'bg-warning text-warning-content border-warning hover:bg-warning/80 cursor-pointer line-through'
                                        : 'bg-base-100 text-base-content border-base-300 hover:bg-primary hover:text-primary-content hover:border-primary cursor-pointer'"
                                    :title="item.isInExclusionList
                                        ? `Klicken um '${item.word}' von der Negativliste zu entfernen`
                                        : `Klicken um '${item.word}' zur Negativliste hinzuzufügen`"
                                >
                                    {{ item.word }}
                                    <span v-if="item.isInExclusionList" class="ml-1">✓</span>
                                </button>
                            </div>
                            <p v-if="uniqueAnonymizedWords.length === 0" class="text-sm text-base-content/50 italic">
                                Keine Wörter anonymisiert
                            </p>
                        </div>

                        <!-- Found Entities List -->
                        <div class="mt-6 p-4 bg-base-200 rounded-lg">
                             <div class="flex items-center justify-between mb-3">
                                <h4 class="font-semibold text-sm">Gefundene Entitäten & Platzhalter</h4>
                            </div>
                            <div class="overflow-x-auto max-h-60 bg-base-100 rounded-lg border border-base-300">
                                <table class="table table-xs w-full table-pin-rows">
                                    <thead>
                                        <tr class="bg-base-200">
                                            <th>Original</th>
                                            <th>Typ</th>
                                            <th>Platzhalter</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="entity in sortedEntities" :key="entity.id" class="hover:bg-base-200/50">
                                            <td class="font-medium max-w-[200px] truncate" :title="entity.name" v-html="formatEntityName(entity)"></td>
                                            <td><span class="badge badge-ghost badge-outline badge-sm text-[10px]">{{ entity.type }}</span></td>
                                            <td class="font-mono text-xs text-base-content/70 select-all">[{{ entity.id }}_{{ entity.type.toLowerCase() }}]</td>
                                            <td>
                                                <span :class="getEntityStatus(entity).class" class="text-xs font-semibold">
                                                    {{ getEntityStatus(entity).label }}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-4 border-t border-base-300 flex justify-end gap-2">
                    <button @click="closeTestModal" class="btn btn-ghost">
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {
    FolderIcon,
    FolderOpenIcon,
    DocumentIcon,
    DocumentCheckIcon,
    ArrowUpTrayIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
    TagIcon,
    PlayIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ClockIcon,
    AdjustmentsHorizontalIcon,
    NoSymbolIcon,
    Cog6ToothIcon,
    MagnifyingGlassIcon,
    SignalIcon
} from '@heroicons/vue/24/outline';

import JSZip from 'jszip';
import { processFile, validateFile, getFileNameWithoutExtension, SUPPORTED_EXTENSIONS } from '../utils/fileProcessor.js';
import anonymizerService, { AVAILABLE_LABELS, DEFAULT_SELECTED_LABELS } from '../utils/anonymizer.js';
import iframeAnonymizer from '../utils/iframeAnonymizer.js';
import modelCache from '../utils/modelCache.js';

const DEFAULT_EXCLUSION_LIST = "Urteil, Beschluss, Verfügung, Art., Abs., lit., SchKG,OR, ZPO, StGB, StPO, VRG, VwVG, AIG, BetmG, ZGB, SVG, §, §§, Kanton, Kantons, Gerichtschreiberin, Gerichtsschreiber, Rekurs, Rekurrent, Rekurrentin, Rekurrenten, Klägerin, Kläger, Klage, Klägerschaft, Beklagte, Beklagter, Gesuchsteller, Gesuchstellers, Gesuchstellerin, Beschwerdeführer, Beschwerdeführerin, Beschwerde, Beschwerdeschrift, Präsident, Präsidentin, Präsidenten, Privatkläger, Privatklägers, Privatklägerin, Privatklägerinnen, Privatklägerschaft, Beschuldigte, Beschuldigter, Beschuldigten, Angeklagter, Angeklagte, Angeklagten, Person, Personen, Verteidiger, Verteidigerin, Verteidigers, Verteidigung, Bezirksgericht, Bezirksrichterin, BZGer, Bezirksrichter, Arbeitsgericht, Arbeitsgerichts, Kriminalrichter, KG, Kriminalrichterin, Kantonsrichterin, Kantonsrichter, Bezirksgerichts, Kantonsgericht, Kantonsgerichts, Obergericht, Obergerichts, OGer, Kriminalgericht, Kriminalgerichts, KGer, Täter, Täterin, Täters, Polizei, Kantonspolizei, Polizist, Polizistin, Polizisten, Polizeibeamte, Polizeibeamter, Polizeibeamten, Vollzugsbehörde, Strafbehörden, Behörden, Oberstaatsanwaltschaft, Staatsanwaltschaft, Staatsanwalt, Staatsanwältin, BGE, BGer, Bundesgerichts, Bundesgerichtes, Bundesgericht, Abteilung, Rechtsanwalt, Rechtsanwalts, Rechtsanwältin, Rechtsanwältinnen, Rechtsanwälte, RA, Eigentümer, Eigentümerin, Besitzer, Besitzerin, Arbeitgeber, Arbeitgeberin, Angestellter, Angestellte, Angestellten, Mitarbeiter, Mitarbeiterin, Mitarbeiterinnen, Schuldner, Schuldnerin, Gläubigerin, Gläubiger, Geschädigte, Geschädigter, Geschädigten, Auskunftsperson, Zeugin, Zeuge, Zeugen der, die, das, von, vom, und, für, als, zu, ein, in, im, am, zu, einer, eine, dies, dieser, diese, Schwester, Bruder, Sohn, Tochter, Familie, Mutter, Vater, Ehemann, Ehehfrau, Ehepartner, Ehegatten, er, sie, ihr, ihre, ihren, ihres, seine, seinen, seines, Partner, Partnerin, Partners, Partnerinnen, Auto, Stadt, E-Mail, E-Mails, eMail, eMails, Mail, Mails, Strassenverkehrsamt, Strafregister Friedensrichter, Friedensrichterin, Friedensrichters, Friedensrichteramt, Friedensrichteramts, Beil., Bel., fl.Akten, Akten, UA, bp, /, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12";

export default {
    name: 'BatchAnonymizer',
    components: {
        FolderIcon,
        FolderOpenIcon,
        DocumentIcon,
        DocumentCheckIcon,
        ArrowUpTrayIcon,
        ArrowDownTrayIcon,
        XMarkIcon,
        TagIcon,
        PlayIcon,
        CheckCircleIcon,
        ExclamationCircleIcon,
        ClockIcon,
        AdjustmentsHorizontalIcon,
        NoSymbolIcon,
        Cog6ToothIcon,
        MagnifyingGlassIcon,
        SignalIcon
    },
    data() {
        return {
            // Layout
            leftPanelWidth: 320,
            centerPanelWidth: 320,
            isDraggingLeft: false,
            isDraggingCenter: false,
            // Input files
            inputFiles: [],
            dragOver: false,

            // Entity selection
            availableLabels: AVAILABLE_LABELS,
            selectedLabels: [...DEFAULT_SELECTED_LABELS],

            // Anonymization options
            anonymizePartialWords: true,
            minCharacterThreshold: 0,
            threshold: 0.3,
            exclusionList: '',
            isCustomExclusionList: false,

            // Model status
            modelStatus: 'idle', // 'idle', 'loading', 'ready', 'error'
            modelProgress: 0,
            modelError: null,

            // Processing state
            isProcessing: false,
            currentProcessingFile: '',
            processedCount: 0,

            // Output files
            outputFiles: [],

            // Test preview state
            showTestModal: false,
            testPreviewFile: null,
            testPreviewLoading: false,
            testPreviewResult: null,
            testPreviewError: null,
            testPreviewError: null,
            isFullTest: false,
            hoveredFileIndex: null,

            // Tooltip state
            hoverTooltip: {
                visible: false,
                x: 0,
                y: 0,
                text: ''
            },

            // Anonymization options
            convertWordToMarkdown: true,
            courtStyle: false

        };
    },
    computed: {
        canStartProcessing() {
            return this.inputFiles.length > 0 &&
                   this.selectedLabels.length > 0 &&
                   !this.isProcessing;
        },
        processingProgress() {
            if (this.inputFiles.length === 0) return 0;
            return Math.round((this.processedCount / this.inputFiles.length) * 100);
        },
        anonymizationStrength: {
            get() {
                // Display inverted: 1 - threshold
                // Round to 2 decimals to avoid float artifacts
                return Math.round((1 - this.threshold) * 100) / 100;
            },
            set(value) {
                // Convert back to threshold: 1 - value
                this.threshold = Math.round((1 - value) * 100) / 100;
            }
        },
        highlightedAnonymizedText() {
            if (!this.testPreviewResult) return '';

            // Create a map of entity ID to original name
            const entityMap = {};
            this.testPreviewResult.entities.forEach(entity => {
                entityMap[entity.id] = entity.name;
            });

            let text = '';
            if (this.testPreviewResult.anonymizedHtml) {
                text = this.testPreviewResult.anonymizedHtml;
            } else {
                text = this.escapeHtml(this.testPreviewResult.anonymizedText);
            }

            // Color mapping by entity type
            const colorMap = {
                'person': 'background-color: #fef08a; color: #713f12;',
                'email': 'background-color: #bfdbfe; color: #1e3a8a;',
                'email address': 'background-color: #bfdbfe; color: #1e3a8a;',
                'phone': 'background-color: #bbf7d0; color: #14532d;',
                'phone number': 'background-color: #bbf7d0; color: #14532d;',
                'mobile phone number': 'background-color: #bbf7d0; color: #14532d;',
                'address': 'background-color: #e9d5ff; color: #581c87;',
                'street': 'background-color: #e9d5ff; color: #581c87;',
                'postal code': 'background-color: #e9d5ff; color: #581c87;',
                'iban': 'background-color: #fecaca; color: #7f1d1d;',
                'credit card number': 'background-color: #fecaca; color: #7f1d1d;',
                'bank account number': 'background-color: #fecaca; color: #7f1d1d;',
                'organization': 'background-color: #fbcfe8; color: #831843;',
                'location': 'background-color: #99f6e4; color: #134e4a;',
                'date': 'background-color: #fed7aa; color: #7c2d12;',
                'time': 'background-color: #fed7aa; color: #7c2d12;'
            };

            // Regex for placeholders: [id_type] or [id_type_suffix] or [id_type_court_REPLACEMENT]
            // Updated to capture court style replacement and regular suffixes
            const placeholderRegex = /\[(\d+)_([a-z_\s]+?)(?:_(court_.+?)|_([a-z0-9]+))?\]/gi;

            text = text.replace(placeholderRegex, (match, id, type, courtReplacementRaw, suffix) => {
                const normalizedType = type.toLowerCase().trim();
                const style = colorMap[normalizedType] || 'background-color: #fed7aa; color: #7c2d12;';
                const originalValue = entityMap[id] || 'Unbekannt';
                
                let originalHtml = originalValue;
                let displayString = match;
                
                // If it's a court style replacement, use the raw text instead of the bracket match
                if (courtReplacementRaw && courtReplacementRaw.startsWith('court_')) {
                    displayString = courtReplacementRaw.substring(6); // remove 'court_'
                } else if (suffix) {
                    try {
                        let wordIndex = -1;
                        
                        // Check if suffix is a number (1-based index)
                        if (/^\d+$/.test(suffix)) {
                            wordIndex = parseInt(suffix, 10) - 1;
                        } 
                        // Check if suffix is a letter (a=0, b=1, etc.)
                        else if (/^[a-z]$/.test(suffix)) {
                            wordIndex = suffix.charCodeAt(0) - 97; // 'a' is 97
                        }
                        
                        if (wordIndex >= 0) {
                            // Split original value into words to finding the correct one to underline
                            // We use a regex that matches words but keeps delimiters so we can reconstruct
                            // This is a "best effort" approach as re-tokenizing perfectly matching the backend might be hard
                            // The anonymizer uses: split(/\s+|-/) which consumes delimiters.
                            
                            // Let's try to just split by space/hyphen to find the word, but we need to reconstruct the string with delimiters...
                            // Actually, let's just use a simple split/join approach for visual representation.
                            // If we can't perfectly reconstruct separators, spaces are usually fine for the tooltip.
                             
                            const words = originalValue.split(/(\s+|-)/);
                            // The split above with capturing group keeps separators.
                            // e.g. "Hans-Peter" -> ["Hans", "-", "Peter"]
                            // e.g. "Hans Peter" -> ["Hans", " ", "Peter"]
                            // e.g. "Hans   Peter" -> ["Hans", "   ", "Peter"]
                            
                            // We need to count "real" words to match the index
                            let currentWordCount = 0;
                            const markedParts = words.map(part => {
                                // Check if this part is a "word" (not only whitespace/separator)
                                if (part.trim().length > 0 && !/^[\s-]+$/.test(part)) {
                                    if (currentWordCount === wordIndex) {
                                        currentWordCount++;
                                        return `<span style="text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 2px;">${part}</span>`;
                                    }
                                    currentWordCount++;
                                }
                                return part;
                            });
                            
                            originalHtml = markedParts.join('');
                        }
                    } catch (e) {
                         console.warn("Error processing suffix for tooltip:", e);
                    }
                }

                // Escape quotes for the data attribute - careful not to escape the HTML we just built
                // Actually, we can't put complex HTML safely into a data attribute without encoding.
                // We'll URL-encode the HTML string.
                const encodedOriginalHtml = encodeURIComponent(originalHtml);
                const escapedOriginal = originalValue.replace(/"/g, '&quot;');
                
                return `<span class="anonymized-token" data-original="${escapedOriginal}" data-original-html="${encodedOriginalHtml}" style="${style} padding: 1px 4px; border-radius: 3px; font-weight: 600; cursor: help;">${displayString}</span>`;
            });

            return text;
        },
        uniqueAnonymizedWords() {
            if (!this.testPreviewResult || !this.testPreviewResult.entities) return [];

            // Get all unique words from entities, split multi-word entities
            const wordsMap = new Map(); // word -> { word, type, entityId, isInExclusionList }
            const currentExclusions = this.parseExclusionList().map(w => w.toLowerCase());

            this.testPreviewResult.entities.forEach(entity => {
                // Split entity name into individual words
                const entityWords = entity.name.split(/\s+/).filter(w => w.trim().length > 0);

                entityWords.forEach(word => {
                    const cleanWord = word.trim();
                    const lowerWord = cleanWord.toLowerCase();

                    // Only add if not already in map (keep first occurrence type)
                    if (!wordsMap.has(lowerWord)) {
                        wordsMap.set(lowerWord, {
                            word: cleanWord,
                            type: entity.type,
                            entityId: entity.id,
                            isInExclusionList: currentExclusions.includes(lowerWord)
                        });
                    }
                });
            });

            // Convert to array and sort alphabetically
            return Array.from(wordsMap.values()).sort((a, b) =>
                a.word.toLowerCase().localeCompare(b.word.toLowerCase())
            );
        },
        sortedEntities() {
            if (!this.testPreviewResult || !this.testPreviewResult.entities) return [];
            return [...this.testPreviewResult.entities].sort((a, b) =>
                a.name.localeCompare(b.name)
            );
        }
    },
    mounted() {
        // Load saved widths
        const savedLeft = localStorage.getItem('batchAnonymizer_leftPanelWidth');
        const savedCenter = localStorage.getItem('batchAnonymizer_centerPanelWidth');
        if (savedLeft) this.leftPanelWidth = parseInt(savedLeft);
        if (savedCenter) this.centerPanelWidth = parseInt(savedCenter);

        // Preload the anonymization model on page load
        this.initializeModel();
        // Load exclusion list from localStorage
        this.loadExclusionList();

        // Add global listeners for drag safety (in case mouse leaves window)
        window.addEventListener('mouseup', this.stopResize);
        window.addEventListener('mousemove', this.handleMouseMove);
    },
    beforeUnmount() {
        window.removeEventListener('mouseup', this.stopResize);
        window.removeEventListener('mousemove', this.handleMouseMove);
    },
    methods: {
        truncateHtml(html, maxLength) {
            if (!html) return '';
            const div = document.createElement('div');
            div.innerHTML = html;
            let currentLength = 0;
            let truncated = false;
            
            function traverseAndTruncate(node) {
                if (truncated) {
                    if (node.parentNode) node.parentNode.removeChild(node);
                    return;
                }
                if (node.nodeType === Node.TEXT_NODE) {
                    const textLen = node.textContent.length;
                    if (currentLength + textLen > maxLength) {
                        node.textContent = node.textContent.substring(0, maxLength - currentLength) + '...';
                        truncated = true;
                        currentLength = maxLength;
                    } else {
                        currentLength += textLen;
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const children = Array.from(node.childNodes);
                    for (const child of children) {
                        if (truncated) {
                            node.removeChild(child);
                        } else {
                            traverseAndTruncate(child);
                        }
                    }
                }
            }
            
            Array.from(div.childNodes).forEach(traverseAndTruncate);
            return div.innerHTML;
        },
        // Exclusion list methods
        saveExclusionList() {
            try {
                // Determine if the current list is different from the default
                const current = this.exclusionList.trim();
                const defaultList = DEFAULT_EXCLUSION_LIST.trim();
                
                // Simple string comparison might fail if order changes, but for now strict equality is a good baseline for "customized"
                // A better approach for "isCustom" is if it was saved to localStorage. A saved list implies customization preference.
                // But we want to show reset only if it differs? 
                // Let's rely on content. 
                // To be robust: normalize (split, sort, join) could work, but user formatting matters too.
                // Let's stick to: if it's saved, it's custom. If we reset, we remove from local storage.
                
                localStorage.setItem('anonymizer_exclusion_list', this.exclusionList);
                this.isCustomExclusionList = true;
            } catch (error) {
                console.error('Failed to save exclusion list to localStorage:', error);
            }
        },
        loadExclusionList() {
            try {
                const saved = localStorage.getItem('anonymizer_exclusion_list');
                if (saved) {
                    this.exclusionList = saved;
                    this.isCustomExclusionList = true;
                } else {
                    // Load default
                    this.exclusionList = DEFAULT_EXCLUSION_LIST;
                    this.isCustomExclusionList = false;
                }
            } catch (error) {
                console.error('Failed to load exclusion list from localStorage:', error);
                // Fallback to default on error
                this.exclusionList = DEFAULT_EXCLUSION_LIST;
            }
        },
        resetExclusionList() {
            this.exclusionList = DEFAULT_EXCLUSION_LIST;
            this.isCustomExclusionList = false;
            localStorage.removeItem('anonymizer_exclusion_list');
        },
        mergeDefaultExclusionList() {
            const currentWords = this.parseExclusionList();
            const defaultWords = DEFAULT_EXCLUSION_LIST.split(',').map(w => w.trim()).filter(w => w.length > 0);
            
            // Set for case-insensitive uniqueness check
            const existingLower = new Set(currentWords.map(w => w.toLowerCase()));
            
            let addedCount = 0;
            defaultWords.forEach(word => {
                if (!existingLower.has(word.toLowerCase())) {
                    currentWords.push(word);
                    existingLower.add(word.toLowerCase());
                    addedCount++;
                }
            });
            
            if (addedCount > 0) {
                this.exclusionList = currentWords.join(', ');
                this.saveExclusionList();
            }
        },
        parseExclusionList() {
            if (!this.exclusionList || this.exclusionList.trim() === '') {
                return [];
            }
            return this.exclusionList
                .split(',')
                .map(word => word.trim())
                .filter(word => word.length > 0);
        },
        getEntityStatus(entity) {
            // Check exclusion list
            const exclusionList = this.parseExclusionList();
            if (exclusionList.length > 0) {
                 const entityWords = entity.name.toLowerCase().split(/\s+/);
                 const isExcluded = entityWords.some(word =>
                     exclusionList.some(excl => excl.toLowerCase() === word)
                 );
                 if (isExcluded) return { code: 'excluded', label: 'Negativliste', class: 'text-warning' };
            }

            // Check length
            if (this.anonymizePartialWords && this.minCharacterThreshold > 0) {
                 if (entity.name.length < this.minCharacterThreshold) {
                     return { code: 'skipped', label: 'Zu kurz', class: 'text-base-content/50' };
                 }
            }

            return { code: 'anonymized', label: 'Anonymisiert', class: 'text-success' };
        },
        addToExclusionList(word) {
            if (!word || word.trim() === '') return;

            const cleanWord = word.trim();
            const currentExclusions = this.parseExclusionList();

            // Check if word already exists (case-insensitive)
            const existingIndex = currentExclusions.findIndex(
                w => w.toLowerCase() === cleanWord.toLowerCase()
            );

            if (existingIndex >= 0) {
                // Remove word
                currentExclusions.splice(existingIndex, 1);
                this.exclusionList = currentExclusions.join(', ');
            } else {
                // Add word
                if (this.exclusionList.trim() === '') {
                    this.exclusionList = cleanWord;
                } else {
                    this.exclusionList = this.exclusionList.trim() + ', ' + cleanWord;
                }
            }

            // Save to localStorage
            this.saveExclusionList();
            
            // Re-run preview test if currently in preview modal
            if (this.showTestModal && this.testPreviewResult) {
                this.testPreviewAdjusting = true;
                this.testAnonymization(this.testPreviewFile, this.isFullTest);
            }
        },

        // Initialize model (ensure it's cached)
        async initializeModel() {
            if (this.modelStatus === 'ready' || this.modelStatus === 'loading') {
                return;
            }

            try {
                this.modelStatus = 'loading';
                this.modelProgress = 0;
                
                // Only download/cache the model, don't load into memory in main thread
                const modelPath = "./models/gliner_multi_pii-v1/onnx/model_fp16.onnx";
                await modelCache.getOrDownloadModel(
                    modelPath, 
                    'quantized', 
                    (progress) => {
                        this.modelProgress = progress;
                    }
                );
                
                this.modelStatus = 'ready';
                console.log('Model cached successfully');
            } catch (error) {
                this.modelStatus = 'error';
                this.modelError = error.message;
                console.error('Failed to cache model:', error);
            }
        },
        // Layout resizing methods
        startResizeLeft() {
            this.isDraggingLeft = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; // Prevent text selection
        },
        startResizeCenter() {
            this.isDraggingCenter = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        },
        handleMouseMove(e) {
            if (this.isDraggingLeft) {
                // Minimum width 200px, Maximum width 600px
                const newWidth = Math.max(200, Math.min(600, e.clientX));
                this.leftPanelWidth = newWidth;
            } else if (this.isDraggingCenter) {
                // Calculate center panel width based on mouse position relative to left panel
                // The dragging handle is at the right of the center panel
                // So width = mouseX - leftPanelWidth - handleWidth(4px usually, negligible)
                const newWidth = Math.max(200, Math.min(600, e.clientX - this.leftPanelWidth));
                this.centerPanelWidth = newWidth;
            }
        },
        stopResize() {
            if (this.isDraggingLeft || this.isDraggingCenter) {
                this.isDraggingLeft = false;
                this.isDraggingCenter = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // Save widths to localStorage
                localStorage.setItem('batchAnonymizer_leftPanelWidth', this.leftPanelWidth);
                localStorage.setItem('batchAnonymizer_centerPanelWidth', this.centerPanelWidth);
            }
        },
        // File input methods
        triggerFileInput() {
            this.$refs.fileInput.click();
        },
        triggerFolderInput() {
            this.$refs.folderInput.click();
        },
        handleFileSelect(event) {
            const files = Array.from(event.target.files);
            this.addFiles(files);
            event.target.value = ''; // Reset input
        },
        handleFolderSelect(event) {
            const files = Array.from(event.target.files);
            // Add relative path from folder
            files.forEach(file => {
                file.relativePath = file.webkitRelativePath || file.name;
            });
            this.addFiles(files);
            event.target.value = ''; // Reset input
        },
        handleFileDrop(event) {
            this.dragOver = false;
            const items = event.dataTransfer.items;

            if (items) {
                // Handle folder drops (if supported)
                const filePromises = [];
                for (const item of items) {
                    if (item.kind === 'file') {
                        const entry = item.webkitGetAsEntry?.();
                        if (entry) {
                            filePromises.push(this.processEntry(entry, ''));
                        } else {
                            const file = item.getAsFile();
                            if (file) filePromises.push(Promise.resolve([file]));
                        }
                    }
                }
                Promise.all(filePromises).then(results => {
                    const allFiles = results.flat();
                    this.addFiles(allFiles);
                });
            } else {
                // Fallback for browsers without items API
                const files = Array.from(event.dataTransfer.files);
                this.addFiles(files);
            }
        },
        async processEntry(entry, path) {
            if (entry.isFile) {
                return new Promise(resolve => {
                    entry.file(file => {
                        file.relativePath = path ? `${path}/${file.name}` : file.name;
                        resolve([file]);
                    });
                });
            } else if (entry.isDirectory) {
                const dirReader = entry.createReader();
                const entries = await new Promise(resolve => {
                    dirReader.readEntries(resolve);
                });
                const subPath = path ? `${path}/${entry.name}` : entry.name;
                const filePromises = entries.map(e => this.processEntry(e, subPath));
                const results = await Promise.all(filePromises);
                return results.flat();
            }
            return [];
        },
        addFiles(files) {
            // Filter valid files and avoid duplicates
            const validFiles = files.filter(file => {
                const validation = validateFile(file);
                if (!validation.valid) {
                    console.warn(`Skipping invalid file: ${file.name} - ${validation.error}`);
                    return false;
                }
                // Check for duplicates
                const relativePath = file.relativePath || file.name;
                const exists = this.inputFiles.some(f =>
                    (f.relativePath || f.name) === relativePath
                );
                return !exists;
            });

            this.inputFiles.push(...validFiles);
        },
        removeInputFile(index) {
            this.inputFiles.splice(index, 1);
        },
        clearInputFiles() {
            this.inputFiles = [];
            this.outputFiles = [];
        },

        // Entity selection methods
        formatLabel(label) {
            return label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        },
        selectAllLabels() {
            this.selectedLabels = [...this.availableLabels];
        },
        selectCommonLabels() {
            this.selectedLabels = [...DEFAULT_SELECTED_LABELS];
        },
        deselectAllLabels() {
            this.selectedLabels = [];
        },

        // Processing methods
        async startProcessing() {
            if (!this.canStartProcessing) return;

            // Ensure model is ready (fallback in case preload failed)
            if (this.modelStatus !== 'ready') {
                await this.initializeModel();
                if (this.modelStatus !== 'ready') {
                    // Model initialization failed
                    this.isProcessing = false;
                    return;
                }
            }

            this.isProcessing = true;
            this.processedCount = 0;
            this.outputFiles = [];

            // Initialize output file entries
            this.inputFiles.forEach(file => {
                const baseName = getFileNameWithoutExtension(file.relativePath || file.name);
                const isDocx = file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc');
                // Preserve folder structure in output name
                const ext = (isDocx && this.convertWordToMarkdown) ? '.md' : '.txt';
                const outputName = baseName + ext;
                this.outputFiles.push({
                    inputFile: file,
                    outputName: outputName,
                    status: 'pending',
                    content: null,
                    entitiesFound: 0,
                    error: null
                });
            });

            // Process files sequentially
            for (let i = 0; i < this.outputFiles.length; i++) {
                const outputFile = this.outputFiles[i];
                outputFile.status = 'processing';
                this.currentProcessingFile = outputFile.inputFile.relativePath || outputFile.inputFile.name;

                try {
                    // Extract text from file
                    const result = await processFile(outputFile.inputFile, { convertWordToMarkdown: this.convertWordToMarkdown });
                    if (!result.success) {
                        throw new Error(result.error);
                    }

                    // Detect entities
                    const entities = await iframeAnonymizer.detectEntities(
                        result.text,
                        this.selectedLabels,
                        this.threshold
                    );

                    // Anonymize text
                    const anonymizedText = anonymizerService.anonymizeText(result.text, entities, {
                        anonymizePartialWords: this.anonymizePartialWords,
                        minCharacterThreshold: this.minCharacterThreshold,
                        exclusionList: this.parseExclusionList(),
                        courtStyle: this.courtStyle
                    });

                    outputFile.content = anonymizedText;
                    outputFile.entitiesFound = entities.length;
                    outputFile.status = 'completed';
                } catch (error) {
                    console.error(`Error processing ${outputFile.inputFile.name}:`, error);
                    outputFile.status = 'error';
                    outputFile.error = error.message;
                }

                this.processedCount++;
            }

            this.isProcessing = false;
            this.currentProcessingFile = '';
        },

        // Download methods
        downloadFile(file) {
            if (!file.content) return;

            const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.outputName;
            a.click();
            URL.revokeObjectURL(url);
        },
        async downloadAllAsZip() {
            const completedFiles = this.outputFiles.filter(f => f.status === 'completed');
            if (completedFiles.length === 0) return;

            const zip = new JSZip();
            completedFiles.forEach(file => {
                zip.file(file.outputName, file.content);
            });

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'anonymisierte_dateien.zip';
            a.click();
            URL.revokeObjectURL(url);
        },

        // Test anonymization preview methods
        async testAnonymization(file, full = false) {
            this.testPreviewFile = file;
            this.isFullTest = full;
            this.testPreviewLoading = true;
            this.testPreviewError = null;
            
            // Only clear result if we're not just adjusting the current one
            if (!this.testPreviewAdjusting) {
                this.testPreviewResult = null;
            }
            
            this.showTestModal = true;

            try {
                // Extract text from file
                const result = await processFile(file, { convertWordToMarkdown: this.convertWordToMarkdown });
                if (!result.success) {
                    throw new Error(result.error);
                }

                const fullText = result.text;
                let limitedText = fullText;
                let limitedHtml = result.html || null;

                // Limit to first ~2000 characters only if not full test
                // (Button says 1000, but we give a bit more context while keeping performance)
                if (!full) {
                    const charLimit = 2000;
                    if (fullText.length > charLimit) {
                         // Cut at limit
                        limitedText = fullText.slice(0, charLimit);
                        // Try to cut at the last space to avoid cutting words in half
                        const lastSpace = limitedText.lastIndexOf(' ');
                        if (lastSpace > 0) {
                            limitedText = limitedText.slice(0, lastSpace) + '...';
                        }
                    }
                    if (limitedHtml) { 
                        limitedHtml = this.truncateHtml(limitedHtml, charLimit);
                    }
                }

                // Detect entities with current settings
                const entities = await iframeAnonymizer.detectEntities(
                    limitedText,
                    this.selectedLabels,
                    this.threshold
                );

                // Get current exclusion list
                const exclusionList = this.parseExclusionList();

                // Count how many entities would be excluded
                const excludedEntities = entities.filter(entity => {
                    const entityWords = entity.name.toLowerCase().split(/\s+/);
                    return entityWords.some(word =>
                        exclusionList.some(excl => excl.toLowerCase() === word)
                    );
                });

                // Count how many entities would be skipped due to length
                let skippedShortEntitiesCount = 0;
                if (this.anonymizePartialWords && this.minCharacterThreshold > 0) {
                    skippedShortEntitiesCount = entities.filter(entity => {
                        // If already excluded by blacklist, don't count here to avoid double counting
                        const isExcluded = excludedEntities.some(e => e.id === entity.id);
                        if (isExcluded) return false;
                        
                        return entity.name.length < this.minCharacterThreshold;
                    }).length;
                }

                // Anonymize text with current options including exclusion list
                const anonymizedText = anonymizerService.anonymizeText(
                    limitedText,
                    entities,
                    {
                        anonymizePartialWords: this.anonymizePartialWords,
                        minCharacterThreshold: this.minCharacterThreshold,
                        exclusionList: exclusionList,
                        courtStyle: this.courtStyle,
                        testPreviewMode: true
                    }
                );

                let anonymizedHtml = null;
                if (limitedHtml) {
                    anonymizedHtml = anonymizerService.anonymizeText(
                        limitedHtml,
                        entities,
                        {
                            anonymizePartialWords: this.anonymizePartialWords,
                            minCharacterThreshold: this.minCharacterThreshold,
                            exclusionList: exclusionList,
                            courtStyle: this.courtStyle,
                            testPreviewMode: true
                        }
                    );
                }

                // Store result
                this.testPreviewResult = {
                    originalText: limitedText,
                    anonymizedText: anonymizedText,
                    anonymizedHtml: anonymizedHtml,
                    entities: entities,
                    wordCount: limitedText.split(/\s+/).length,
                    totalWords: fullText.split(/\s+/).length,
                    exclusionListCount: exclusionList.length,
                    excludedEntitiesCount: excludedEntities.length,
                    skippedShortEntitiesCount: skippedShortEntitiesCount
                };

            } catch (error) {
                console.error('Test anonymization error:', error);
                this.testPreviewError = error.message;
            } finally {
                this.testPreviewLoading = false;
                this.testPreviewAdjusting = false;
            }
        },

        downloadTestResult() {
            if (!this.testPreviewResult || !this.testPreviewResult.anonymizedText) return;

            const originalName = this.testPreviewFile?.name || 'text';
            const baseName = getFileNameWithoutExtension(originalName);
            const isDocx = originalName.toLowerCase().endsWith('.docx') || originalName.toLowerCase().endsWith('.doc');
            const ext = (isDocx && this.convertWordToMarkdown) ? '.md' : '.txt';
            const fileName = `${baseName}_preview_anonymized${ext}`;

            const blob = new Blob([this.testPreviewResult.anonymizedText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        },

        closeTestModal() {
            this.showTestModal = false;
            this.testPreviewResult = null;
            this.testPreviewError = null;
            this.testPreviewFile = null;
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        formatEntityName(entity) {
            const exclusionList = this.parseExclusionList();
            if (exclusionList.length === 0) return this.escapeHtml(entity.name);

            // Split by spaces and hyphens to find words, but preserve separators for reconstruction
            // We use capturing group in split to keep separators
            const parts = entity.name.split(/(\s+|-)/);
            
            const formattedParts = parts.map(part => {
                // Skip separators/whitespace for checking
                if (!part.trim() || /^[\s-]+$/.test(part)) return this.escapeHtml(part);
                
                // Check if word is in exclusion list (case insensitive)
                const isExcluded = exclusionList.some(excl => excl.toLowerCase() === part.toLowerCase());
                
                if (isExcluded) {
                    return `<span class="line-through decoration-wavy decoration-error/50 text-base-content/60" title="In Negativliste">${this.escapeHtml(part)}</span>`;
                }
                return this.escapeHtml(part);
            });
            
            return formattedParts.join('');
        },
        handleTextMouseOver(e) {
            const target = e.target.closest('.anonymized-token');
            if (target) {
                if (target.dataset.originalHtml) {
                     this.hoverTooltip.text = decodeURIComponent(target.dataset.originalHtml);
                } else if (target.dataset.original) {
                    // Fallback to plain text if no HTML version
                    this.hoverTooltip.text = this.escapeHtml(target.dataset.original);
                }
                
                if (this.hoverTooltip.text) {
                    this.hoverTooltip.visible = true;
                    this.hoverTooltip.x = e.clientX;
                    this.hoverTooltip.y = e.clientY;
                }
            }
        },
        handleTextMouseOut(e) {
            const target = e.target.closest('.anonymized-token');
            if (target) {
                this.hoverTooltip.visible = false;
            }
        },
        handleTextMouseMove(e) {
            if (this.hoverTooltip.visible) {
                this.hoverTooltip.x = e.clientX;
                this.hoverTooltip.y = e.clientY;
            }
        }
    }
};
</script>
