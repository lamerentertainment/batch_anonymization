<template>
    <div class="flex flex-col h-screen bg-base-200">
        <!-- Header -->
        <header class="bg-base-100 border-b border-base-300 px-6 py-4 flex items-center justify-between">
            <div class="flex items-baseline gap-x-4">
                <h1 class="text-2xl font-bold text-base-content">
                    {{ viewMode === 'batch' ? 'Batch-Anonymisierung' : 'Einzeldatei-Anonymisierung' }}
                </h1>
                <p class="text-sm text-base-content/60 mt-1">
                    {{ viewMode === 'batch' ? 'Mehrere Dateien nacheinander anonymisieren' : 'Eine Datei interaktiv anonymisieren und bearbeiten' }}
                </p>
            </div>
            <div class="flex items-center gap-1 bg-base-200 rounded-lg p-1">
                <button
                    @click="viewMode = 'single'"
                    class="btn btn-sm rounded-md transition-all"
                    :class="viewMode === 'single' ? 'btn-primary shadow-sm' : 'btn-ghost text-base-content/60'"
                >
                    Einzeldatei
                </button>
                <button
                    @click="viewMode = 'batch'"
                    class="btn btn-sm rounded-md transition-all"
                    :class="viewMode === 'batch' ? 'btn-primary shadow-sm' : 'btn-ghost text-base-content/60'"
                >
                    Batch
                </button>
            </div>
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

        <!-- Main Content: 3 Columns (Batch Mode) -->
        <main v-if="viewMode === 'batch'" class="flex-1 flex overflow-hidden">
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
                                v-model="anonymizeFilenames"
                                class="checkbox checkbox-xs checkbox-primary"
                            >
                            <span class="label-text text-xs font-semibold">Dateinamen der Output-Dateien anonymisieren (anon-text-########)</span>
                        </label>
                        <label class="label cursor-pointer justify-start gap-2 p-0">
                            <input
                                type="checkbox"
                                v-model="courtStyle"
                                class="checkbox checkbox-xs checkbox-primary"
                            >
                            <span class="label-text text-xs font-semibold">gerichtsübliche Anonymisierung (A.________) vornehmen</span>
                        </label>
                        <label class="label cursor-pointer justify-start gap-2 p-0">
                            <input
                                type="checkbox"
                                v-model="convertWordToMarkdown"
                                class="checkbox checkbox-xs checkbox-primary"
                            >
                            <span class="label-text text-xs font-semibold">importierte Word-Dateien (.docx) als Markdown-Dateien ausgeben</span>
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
                                placeholder="Wörter durch Semikolon trennen, z.B.: Berlin; Deutschland; Max"
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

        <!-- Single File View -->
        <main v-else-if="viewMode === 'single'" class="flex-1 flex flex-col overflow-hidden">

            <!-- Row 1: File Upload Bar -->
            <div class="bg-base-100 border-b border-base-300 px-4 py-2 flex items-center gap-3">
                <input ref="singleFileInput" type="file" accept=".txt,.pdf,.docx,.doc" class="hidden" @change="handleSingleFileInputChange">

                <!-- Drop Zone -->
                <div
                    class="flex-1 border-2 border-dashed rounded-lg px-4 py-2 flex items-center gap-3 cursor-pointer transition-colors min-h-[44px]"
                    :class="singleFileDragOver ? 'border-primary bg-primary/10' : testPreviewFile ? 'border-success/50 bg-success/5' : 'border-base-300 hover:border-primary/50'"
                    @click="triggerSingleFileInput"
                    @drop.prevent="handleSingleFileDrop"
                    @dragover.prevent="singleFileDragOver = true"
                    @dragleave.prevent="singleFileDragOver = false"
                >
                    <ArrowUpTrayIcon v-if="!testPreviewFile" class="w-5 h-5 text-base-content/40 flex-shrink-0" />
                    <DocumentCheckIcon v-else class="w-5 h-5 text-success flex-shrink-0" />
                    <span class="text-sm truncate" :class="testPreviewFile ? 'text-base-content' : 'text-base-content/50'">
                        {{ testPreviewFile ? testPreviewFile.name : 'Datei hochladen oder hierher ziehen (docx, pdf, txt)' }}
                    </span>
                    <span v-if="testPreviewResult" class="ml-auto text-xs text-base-content/40 flex-shrink-0">
                        {{ testPreviewResult.wordCount }} Wörter
                    </span>
                </div>

                <!-- Dateinamen anonymisieren -->
                <div class="tooltip tooltip-bottom flex-shrink-0" data-tip="Output-Dateinamen anonymisieren: anon-text-########">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" v-model="anonymizeFilenames" class="toggle toggle-xs toggle-primary">
                        <span class="text-xs font-semibold text-base-content/70">Dateinamen anonymisieren</span>
                    </label>
                </div>

                <!-- DOCX → MD -->
                <div class="tooltip tooltip-bottom flex-shrink-0" data-tip="Word-Dateien (.docx) als Markdown ausgeben – behält Formatierung (Fett, Listen, etc.) bei">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" v-model="convertWordToMarkdown" class="toggle toggle-xs toggle-primary">
                        <span class="text-xs font-semibold text-base-content/70">DOCX → MD</span>
                    </label>
                </div>

                <!-- Download Button(s) -->
                <div class="flex items-center gap-1 flex-shrink-0">
                    <template v-if="testPreviewResult && isDocxFile">
                        <button @click="downloadSingleResult('txt')" class="btn btn-sm btn-ghost gap-1" title="Als TXT herunterladen">
                            <ArrowDownTrayIcon class="w-4 h-4" /> TXT
                        </button>
                        <button @click="downloadSingleResult('md')" class="btn btn-sm btn-ghost gap-1" title="Als Markdown herunterladen">
                            <ArrowDownTrayIcon class="w-4 h-4" /> MD
                        </button>
                    </template>
                    <button v-else @click="downloadSingleResult()" class="btn btn-sm btn-ghost gap-1" :disabled="!testPreviewResult">
                        <ArrowDownTrayIcon class="w-4 h-4" />
                        <span class="hidden sm:inline">Download</span>
                    </button>
                </div>
            </div>

            <!-- Row 2: Settings Bar -->
            <div class="bg-base-100 border-b border-base-300 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <!-- Anonymisierungsstärke -->
                <div class="tooltip tooltip-bottom" data-tip="Hoch = mehr anonymisiert (mehr False Positives). Niedrig = weniger anonymisiert (mehr False Negatives).">
                    <div class="flex items-center gap-2">
                        <label class="text-xs font-semibold text-base-content/70 whitespace-nowrap">Stärke:</label>
                        <input type="range" v-model="anonymizationStrength" min="0.05" max="0.8" step="0.05" class="range range-xs range-primary w-24">
                        <span class="text-xs font-mono text-base-content/60 w-8">{{ Math.round(anonymizationStrength * 100) }}%</span>
                    </div>
                </div>

                <!-- Entity Selection Dropdown -->
                <div class="tooltip tooltip-bottom" data-tip="Entitätskategorien auswählen, die anonymisiert werden sollen">
                <div class="dropdown">
                    <label tabindex="0" class="btn btn-xs btn-outline gap-1 cursor-pointer">
                        Entitäten ({{ selectedLabels.length }}/{{ availableLabels.length }})
                        <ChevronDownIcon class="w-3 h-3" />
                    </label>
                    <div tabindex="0" class="dropdown-content z-[50] p-3 shadow-lg bg-base-100 rounded-lg w-64 border border-base-300">
                        <div class="flex gap-1 mb-2">
                            <button @click="selectAllLabels" class="btn btn-xs">Alle</button>
                            <button @click="selectCommonLabels" class="btn btn-xs">Häufige</button>
                            <button @click="deselectAllLabels" class="btn btn-xs">Keine</button>
                        </div>
                        <div class="max-h-48 overflow-y-auto">
                            <label v-for="label in availableLabels" :key="label" class="flex items-center gap-2 py-1 cursor-pointer hover:bg-base-200 px-2 rounded">
                                <input type="checkbox" v-model="selectedLabels" :value="label" class="checkbox checkbox-xs checkbox-primary">
                                <span class="text-xs">{{ formatLabel(label) }}</span>
                            </label>
                        </div>
                    </div>
                </div>
                </div>

                <!-- Teilwörter Toggle -->
                <div class="tooltip tooltip-bottom" data-tip="Wenn aktiv: einzelne Wortbestandteile erkannter Entitäten werden ebenfalls anonymisiert (z.B. «Max» aus «Vater von Max»)">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" v-model="anonymizePartialWords" class="toggle toggle-xs toggle-primary">
                        <span class="text-xs font-semibold text-base-content/70">Teilwörter</span>
                    </label>
                </div>

                <!-- Min. Zeichen -->
                <div class="tooltip tooltip-bottom" data-tip="Entitätsbestandteile mit weniger als N Zeichen werden nicht anonymisiert (z.B. eine alleinstehende «5» aus «Landenbergstrasse 5»)">
                    <div v-show="anonymizePartialWords" class="flex items-center gap-1">
                        <label class="text-xs text-base-content/70 whitespace-nowrap">Min. Zeichen:</label>
                        <input type="number" v-model.number="minCharacterThreshold" min="0" max="50" class="input input-xs input-bordered w-14">
                    </div>
                </div>

                <!-- Gerichtsüblich Toggle -->
                <div class="tooltip tooltip-bottom" data-tip="Gerichtsübliche Darstellung: Entitäten werden als A.________ anonymisiert">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" v-model="courtStyle" @change="handleCourtStyleChange" class="toggle toggle-xs toggle-primary">
                        <span class="text-xs font-semibold text-base-content/70">Gerichtsüblich</span>
                    </label>
                </div>

                <!-- Negativliste Dropdown -->
                <div class="tooltip tooltip-bottom" data-tip="Wörter, die trotz Erkennung als PII nie anonymisiert werden">
                    <div class="dropdown dropdown-bottom">
                        <label tabindex="0" class="btn btn-xs btn-outline gap-1 cursor-pointer">
                            Negativliste
                            <ChevronDownIcon class="w-3 h-3" />
                        </label>
                        <div tabindex="0" class="dropdown-content z-[50] p-3 shadow-lg bg-base-100 rounded-lg w-80 border border-base-300">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-semibold">Negativliste</span>
                                <div class="flex gap-1">
                                    <button @click="mergeDefaultExclusionList" class="btn btn-xs">+ Standard</button>
                                    <button @click="resetExclusionList" class="btn btn-xs btn-error btn-outline">Zurücksetzen</button>
                                </div>
                            </div>
                            <textarea
                                v-model="exclusionList"
                                @input="saveExclusionList"
                                class="textarea textarea-bordered textarea-xs w-full h-24 font-mono text-xs"
                                placeholder="Wörter durch Semikolon trennen, z.B.: Berlin; Deutschland"
                            ></textarea>
                        </div>
                    </div>
                </div>


                <!-- Anonymisieren Button -->
                <button
                    @click="runSingleAnonymization"
                    class="btn btn-primary btn-sm ml-auto"
                    :disabled="!testPreviewFile || selectedLabels.length === 0 || (testPreviewLoading && !testPreviewAdjusting)"
                >
                    <span v-if="testPreviewLoading && !testPreviewAdjusting" class="loading loading-spinner loading-xs mr-1"></span>
                    {{ (testPreviewLoading && !testPreviewAdjusting) ? 'Anonymisiere...' : 'Anonymisieren' }}
                </button>
            </div>

            <!-- Row 3: Main Content Area -->
            <div class="flex-1 flex overflow-hidden">

                <!-- Text Display Area -->
                <div class="flex-1 flex flex-col overflow-hidden p-4">

                    <!-- Loading -->
                    <div v-if="testPreviewLoading && !testPreviewAdjusting" class="flex-1 flex items-center justify-center">
                        <span class="loading loading-spinner loading-lg text-primary"></span>
                        <span class="ml-3 text-base-content/60">Anonymisiere Text...</span>
                    </div>

                    <!-- Error -->
                    <div v-else-if="testPreviewError" class="alert alert-error">
                        <ExclamationCircleIcon class="w-6 h-6" />
                        <span>Fehler: {{ testPreviewError }}</span>
                    </div>

                    <!-- No file selected -->
                    <div v-else-if="!testPreviewFile" class="flex-1 flex items-center justify-center">
                        <div class="text-center text-base-content/40">
                            <DocumentIcon class="w-20 h-20 mx-auto mb-4 opacity-20" />
                            <p class="text-xl font-medium">Datei hochladen um zu beginnen</p>
                            <p class="text-sm mt-2 opacity-70">Unterstützte Formate: .docx, .pdf, .txt</p>
                        </div>
                    </div>

                    <!-- File selected, not yet anonymized -->
                    <div v-else-if="!testPreviewResult" class="flex-1 flex items-center justify-center">
                        <div class="text-center text-base-content/40">
                            <DocumentCheckIcon class="w-20 h-20 mx-auto mb-4 opacity-30" />
                            <p class="text-xl font-medium">{{ testPreviewFile.name }}</p>
                            <p class="text-sm mt-3">Einstellungen prüfen und auf <strong class="text-primary opacity-80">Anonymisieren</strong> klicken</p>
                        </div>
                    </div>

                    <!-- Result -->
                    <template v-else>
                        <!-- Statistics -->
                        <div class="mb-3 p-3 bg-base-200 rounded-lg flex flex-wrap gap-4 text-sm flex-shrink-0">
                            <span><strong class="text-primary">{{ testPreviewResult.entities.length }}</strong> Entitäten gefunden</span>
                            <span class="text-base-content/40">|</span>
                            <span>Labels: <strong>{{ selectedLabels.length }}</strong></span>
                            <span class="text-base-content/40">|</span>
                            <span>Einzelne Wörter: <strong :class="anonymizePartialWords ? 'text-success' : 'text-base-content/60'">{{ anonymizePartialWords ? 'An' : 'Aus' }}</strong></span>
                            <span class="text-base-content/40">|</span>
                            <span>Min. Zeichen: <strong>{{ minCharacterThreshold }}</strong>
                                <span v-if="testPreviewResult.skippedShortEntitiesCount > 0" class="text-warning ml-1">({{ testPreviewResult.skippedShortEntitiesCount }} übersprungen)</span>
                            </span>
                            <template v-if="testPreviewResult.exclusionListCount > 0">
                                <span class="text-base-content/40">|</span>
                                <span>Negativliste: <strong class="text-warning">{{ testPreviewResult.exclusionListCount }}</strong> Wörter
                                    <span v-if="testPreviewResult.excludedEntitiesCount > 0" class="text-success">({{ testPreviewResult.excludedEntitiesCount }} übersprungen)</span>
                                </span>
                            </template>
                        </div>

                        <!-- Anonymized Text with Highlighting -->
                        <div
                            ref="singlePreviewContainer"
                            class="flex-1 p-4 border border-base-300 rounded-lg bg-base-200/50 whitespace-pre-wrap font-mono text-sm leading-relaxed overflow-y-auto cursor-text [&_p]:mb-4 [&_h1]:mb-4 [&_h2]:mb-4 [&_h3]:mb-4 [&_ul]:mb-4 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:ml-4 [&_ol]:list-decimal"
                            v-html="highlightedAnonymizedText"
                            @mouseover="handleTextMouseOver"
                            @mouseout="handleTextMouseOut"
                            @mousemove="handleTextMouseMove"
                            @mouseup="handleTextSelection"
                            @click="handleTokenClick"
                        ></div>

                        <!-- Legend -->
                        <div class="mt-3 flex gap-2 flex-wrap text-xs items-center flex-shrink-0">
                            <span class="font-medium text-base-content/60 mr-2">Legende:</span>
                            <span class="px-2 py-1 bg-yellow-200 text-yellow-900 rounded">person</span>
                            <span class="px-2 py-1 bg-blue-200 text-blue-900 rounded">email</span>
                            <span class="px-2 py-1 bg-green-200 text-green-900 rounded">phone</span>
                            <span class="px-2 py-1 bg-purple-200 text-purple-900 rounded">address</span>
                            <span class="px-2 py-1 bg-red-200 text-red-900 rounded">iban/kreditkarte</span>
                            <span class="px-2 py-1 bg-pink-200 text-pink-900 rounded">organisation</span>
                            <span class="px-2 py-1 bg-teal-200 text-teal-900 rounded">ort</span>
                            <span class="px-2 py-1 bg-orange-200 text-orange-900 rounded">andere</span>
                            <span class="px-2 py-1 bg-gray-200 text-gray-900 rounded border border-gray-400">manuell</span>
                            <span class="text-base-content/40 ml-2 italic">Hover zeigt Original, Markieren zum Anonymisieren</span>
                        </div>
                    </template>
                </div>

                <!-- Right: Panel Toggle Tabs + Panels -->
                <div v-if="testPreviewResult && !panelsInFooter" class="flex flex-shrink-0">

                    <!-- Vertical toggle tabs -->
                    <div class="flex flex-col bg-base-100 border-l border-base-300">
                        <button
                            @click="panelsInFooter = true"
                            class="px-2 py-2 text-base-content/40 hover:text-primary hover:bg-base-200 transition-colors border-b border-base-300 flex items-center justify-center"
                            title="Panels in den Footer verschieben"
                        >↓</button>
                        <button
                            @click="showEntityPanel = !showEntityPanel"
                            class="px-2 py-5 text-xs font-semibold border-b border-base-300 hover:bg-base-200 transition-colors select-none"
                            :class="showEntityPanel ? 'bg-base-200 text-primary' : 'text-base-content/60'"
                            title="Gefundene Entitäten & Platzhalter"
                            style="writing-mode: vertical-rl; text-orientation: mixed;"
                        >
                            Entitäten &amp; Platzhalter
                        </button>
                        <button
                            @click="showWordsPanel = !showWordsPanel"
                            class="px-2 py-5 text-xs font-semibold hover:bg-base-200 transition-colors select-none"
                            :class="showWordsPanel ? 'bg-base-200 text-primary' : 'text-base-content/60'"
                            title="Anonymisierte Wörter (Negativliste)"
                            style="writing-mode: vertical-rl; text-orientation: mixed;"
                        >
                            Anonymisierte Wörter
                        </button>
                    </div>

                    <!-- Entity Panel -->
                    <div v-if="showEntityPanel" class="w-80 flex flex-col overflow-hidden bg-base-100 border-l border-base-300">
                        <div class="px-3 py-2 border-b border-base-300">
                            <h4 class="font-semibold text-sm">Gefundene Entitäten & Platzhalter</h4>
                        </div>
                        <div class="flex-1 overflow-auto" ref="entityPanelSideScroll">
                            <table class="table table-xs w-full table-pin-rows">
                                <thead>
                                    <tr class="bg-base-200">
                                        <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('name')">
                                            Original <span v-if="entitySortColumn === 'name'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                        </th>
                                        <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('type')">
                                            Typ <span v-if="entitySortColumn === 'type'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                        </th>
                                        <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('placeholder')">
                                            Platzhalter <span v-if="entitySortColumn === 'placeholder'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                        </th>
                                        <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('status')">
                                            Status <span v-if="entitySortColumn === 'status'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                        </th>
                                        <th class="text-center">Aktion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="entity in sortedEntities" :key="entity.id" :data-entity-name="entity.name" class="hover:bg-base-200/50">
                                        <td class="font-medium max-w-[150px] truncate cursor-pointer hover:text-primary" :title="entity.name + ' – klicken um im Text zu scrollen'" v-html="formatEntityName(entity)" @click.stop="scrollToNextTokenForEntity(entity.name)"></td>
                                        <td>
                                            <select
                                                class="select select-bordered select-xs text-[10px] h-6 min-h-6 px-2 w-full max-w-[100px]"
                                                :value="entity.type"
                                                @change="changeEntityCategory(entity.name, $event.target.value)"
                                            >
                                                <option v-for="label in availableLabels" :key="label" :value="label">{{ formatLabel(label) }}</option>
                                            </select>
                                        </td>
                                        <td class="font-mono text-xs text-base-content/70 select-all">{{ getActualPlaceholder(entity) }}</td>
                                        <td>
                                            <span :class="getEntityStatus(entity).class" class="text-xs font-semibold">{{ getEntityStatus(entity).label }}</span>
                                        </td>
                                        <td class="text-center">
                                            <button
                                                v-if="!entity.isManual"
                                                @click="toggleSessionRemovedEntity(entity.name)"
                                                class="btn btn-ghost btn-xs btn-square"
                                                :class="sessionRemovedEntities.includes(entity.name) ? 'text-success' : 'text-error'"
                                                :title="sessionRemovedEntities.includes(entity.name) ? 'Anonymisierung wieder aktivieren' : 'Diese Entität ausschliessen'"
                                            >
                                                <XMarkIcon v-if="!sessionRemovedEntities.includes(entity.name)" class="w-4 h-4" />
                                                <ArrowPathIcon v-else class="w-4 h-4" />
                                            </button>
                                            <button
                                                v-else
                                                @click="removeManualEntity(entity.name)"
                                                class="btn btn-ghost btn-xs btn-square text-error"
                                                title="Manuelle Anonymisierung entfernen"
                                            >
                                                <XMarkIcon class="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Words Panel -->
                    <div v-if="showWordsPanel" class="w-56 flex flex-col overflow-hidden bg-base-100 border-l border-base-300">
                        <div class="px-3 py-2 border-b border-base-300">
                            <h4 class="font-semibold text-sm">Anonymisierte Wörter</h4>
                            <p class="text-xs text-base-content/50 mt-0.5">Klicken um zur Negativliste hinzuzufügen</p>
                        </div>
                        <div class="flex-1 overflow-auto p-3">
                            <div class="flex flex-wrap gap-2">
                                <button
                                    v-for="item in uniqueAnonymizedWords"
                                    :key="item.word"
                                    @click="addToExclusionList(item.word)"
                                    class="px-2 py-1 text-xs rounded-full border transition-all"
                                    :class="item.isInExclusionList
                                        ? 'bg-warning text-warning-content border-warning hover:bg-warning/80 cursor-pointer line-through'
                                        : 'bg-base-100 text-base-content border-base-300 hover:bg-primary hover:text-primary-content hover:border-primary cursor-pointer'"
                                >
                                    {{ item.word }}<span v-if="item.isInExclusionList" class="ml-1">✓</span>
                                </button>
                            </div>
                            <p v-if="uniqueAnonymizedWords.length === 0" class="text-sm text-base-content/50 italic">
                                Keine Wörter anonymisiert
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Tooltip (fixed positioned, works in single-file mode) -->
                <div
                    v-if="hoverTooltip.visible"
                    class="fixed z-[100] px-3 pt-2 pb-2 text-xs font-medium text-base-content bg-base-300 border border-base-200 rounded shadow-xl transform -translate-x-1/2 -translate-y-full flex flex-col gap-2 min-w-[220px]"
                    :class="hoverTooltip.isPinned ? 'ring-2 ring-primary border-primary shadow-2xl transition-all duration-200' : ''"
                    :style="tooltipStyle"
                    @mouseenter="handleTooltipMouseEnter"
                    @mouseleave="handleTooltipMouseLeave"
                >
                    <button
                        v-if="hoverTooltip.isPinned"
                        @click.stop="unpinTooltip"
                        class="absolute top-1 right-1 btn btn-ghost btn-xs btn-square text-gray-400 hover:text-white"
                        title="Anheften aufheben"
                    >
                        <XMarkIcon class="w-3 h-3" />
                    </button>
                    <div v-if="hoverTooltip.isPinned" class="flex flex-col gap-2 pr-6 mt-1">
                        <div v-if="courtEntityMappings[hoverTooltip.entityName]" class="bg-base-200 p-2 rounded text-xs text-base-content border border-base-300 mb-2">
                            <div class="font-bold mb-1">Zusammengelegt auf:</div>
                            <div class="flex justify-between items-center gap-2">
                                <span class="truncate">{{ courtEntityMappings[hoverTooltip.entityName] }}</span>
                                <button @click.stop="unmergeEntity(hoverTooltip.entityName)" class="btn btn-xs btn-ghost btn-square text-error" title="Zusammenlegen aufheben">
                                    <XMarkIcon class="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                        <div v-if="getMappedToThis(hoverTooltip.entityName).length > 0" class="bg-base-200 p-2 rounded text-xs text-base-content border border-base-300 mb-2">
                            <div class="font-bold mb-1">Hiermit zusammengelegt:</div>
                            <div class="flex flex-col gap-1">
                                <div v-for="source in getMappedToThis(hoverTooltip.entityName)" :key="source" class="flex justify-between items-center gap-2">
                                    <span class="truncate">{{ source }}</span>
                                    <button @click.stop="unmergeEntity(source)" class="btn btn-xs btn-ghost btn-square text-error" title="Zusammenlegen aufheben">
                                        <XMarkIcon class="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="form-control w-full">
                            <label class="label p-0 pb-1">
                                <span class="label-text-alt text-base-content/70">
                                    {{ courtEntityMappings[hoverTooltip.entityName] || getMappedToThis(hoverTooltip.entityName).length > 0 ? 'Weitere Entität zusammenlegen:' : 'Entität hiermit zusammenlegen:' }}
                                </span>
                            </label>
                            <select
                                class="select select-bordered select-xs w-full text-base-content"
                                @change="mergeEntity($event.target.value, hoverTooltip.entityName); $event.target.value = ''"
                            >
                                <option value="" disabled selected>Entität auswählen...</option>
                                <option
                                    v-for="target in getMergeSuggestions(hoverTooltip.entityName, hoverTooltip.entityType)"
                                    :key="target.name"
                                    :value="target.name"
                                >
                                    {{ target.isRecommended ? '★ ' : '' }}{{ target.name }}{{ target.isRecommended ? ' (empfohlen)' : '' }}
                                </option>
                            </select>
                        </div>
                        <div v-if="courtStyle && (hoverTooltip.entityType === 'person' || hoverTooltip.entityType === 'organization')" class="border-t border-base-content/20 my-1"></div>
                        <div class="form-control w-full my-1">
                            <label class="label p-0 pb-1">
                                <span class="label-text-alt text-base-content/70">Kategorie ändern:</span>
                            </label>
                            <select
                                class="select select-bordered select-xs w-full text-base-content"
                                :value="hoverTooltip.entityType"
                                @change="changeEntityCategory(hoverTooltip.entityName, $event.target.value)"
                            >
                                <option value="" disabled>Bitte wählen...</option>
                                <option v-for="label in availableLabels" :key="label" :value="label">
                                    {{ formatLabel(label) }}
                                </option>
                            </select>
                        </div>
                        <div class="border-t border-base-content/20 my-1"></div>
                        <div class="flex flex-wrap gap-1">
                            <button
                                v-for="word in getSurgicalWords(hoverTooltip.entityName)"
                                :key="word"
                                @click="addToExclusionList(word)"
                                class="btn btn-[10px] h-auto min-h-0 py-1 px-2 btn-outline gap-1"
                                :class="isWordExcluded(word)
                                    ? 'bg-warning text-warning-content border-warning hover:bg-warning/80 line-through'
                                    : 'btn-warning'"
                            >
                                <NoSymbolIcon v-if="!isWordExcluded(word)" class="w-3 h-3" />
                                <CheckIcon v-else class="w-3 h-3" />
                                {{ word }}
                            </button>
                        </div>
                        <button
                            @click="toggleSessionRemovedEntity(hoverTooltip.entityName)"
                            class="btn btn-xs btn-outline btn-error w-full gap-1 text-[10px]"
                        >
                            <XMarkIcon class="w-3 h-3" />
                            Ganze Entität ignorieren
                        </button>
                    </div>
                    <div :class="hoverTooltip.isPinned ? 'border-t border-base-content/20 pt-1 mt-1' : ''">
                        Original: <span class="font-bold text-primary-focus" v-html="hoverTooltip.text"></span>
                        <span v-if="hoverTooltip.isPinned" class="ml-2 text-[8px] uppercase tracking-widest text-primary opacity-70">Angeheftet</span>
                    </div>
                </div>

                <!-- Selection Menu (single-file mode) -->
                <div
                    v-if="selectionMenu.visible"
                    class="fixed z-[110] bg-base-100 rounded-lg shadow-2xl border border-primary/20 p-1 flex items-center gap-1 animate-in fade-in zoom-in duration-150"
                    :style="{ top: selectionMenu.y + 'px', left: Math.max(108, Math.min(window.innerWidth - 108, selectionMenu.x)) + 'px', transform: 'translate(-50%, -120%)' }"
                    @mousedown.stop
                >
                    <button
                        v-if="selectionMenu.step === 1"
                        @click="selectionMenu.step = 2"
                        class="btn btn-primary btn-xs normal-case gap-1"
                    >
                        <TagIcon class="w-3 h-3" />
                        Markierte Stelle anonymisieren?
                    </button>
                    <div v-else class="flex flex-col gap-1 p-2 min-w-[200px]">
                        <span class="text-xs font-bold text-base-content/70">Kategorie auswählen:</span>
                        <select v-model="selectionMenu.selectedCategory" class="select select-bordered select-xs w-full">
                            <option value="" disabled selected>Bitte wählen...</option>
                            <option v-for="label in availableLabels" :key="label" :value="label">
                                {{ formatLabel(label) }}
                            </option>
                        </select>
                        <div class="flex justify-end gap-1 mt-1">
                            <button @click="cancelManualEntityAdding" class="btn btn-ghost btn-xs">Abbrechen</button>
                            <button @click="addManualEntity" class="btn btn-primary btn-xs" :disabled="!selectionMenu.selectedCategory">Speichern</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Panels (alternative to side panel) -->
            <div v-if="testPreviewResult && panelsInFooter" class="border-t border-base-300 bg-base-100 flex-shrink-0 flex flex-col" style="height: 240px;">
                <!-- Tab bar -->
                <div class="flex items-center border-b border-base-300 flex-shrink-0">
                    <button
                        @click="showEntityPanel = !showEntityPanel"
                        class="px-4 py-2 text-xs font-semibold border-r border-base-300 hover:bg-base-200 transition-colors select-none"
                        :class="showEntityPanel ? 'bg-base-200 text-primary' : 'text-base-content/60'"
                    >Entitäten &amp; Platzhalter</button>
                    <button
                        @click="showWordsPanel = !showWordsPanel"
                        class="px-4 py-2 text-xs font-semibold border-r border-base-300 hover:bg-base-200 transition-colors select-none"
                        :class="showWordsPanel ? 'bg-base-200 text-primary' : 'text-base-content/60'"
                    >Anonymisierte Wörter</button>
                    <button
                        @click="panelsInFooter = false"
                        class="ml-auto px-3 py-2 text-xs text-base-content/40 hover:text-primary hover:bg-base-200 transition-colors"
                        title="Als Seitenpanel anzeigen"
                    >→ Seitenpanel</button>
                </div>
                <!-- Panel content -->
                <div class="flex flex-1 overflow-hidden">
                    <!-- Entity Panel (footer) -->
                    <div v-if="showEntityPanel" class="flex-1 overflow-auto border-r border-base-300" ref="entityPanelFooterScroll">
                        <table class="table table-xs w-full table-pin-rows">
                            <thead>
                                <tr class="bg-base-200">
                                    <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('name')">
                                        Original <span v-if="entitySortColumn === 'name'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                    </th>
                                    <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('type')">
                                        Typ <span v-if="entitySortColumn === 'type'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                    </th>
                                    <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('placeholder')">
                                        Platzhalter <span v-if="entitySortColumn === 'placeholder'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                    </th>
                                    <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('status')">
                                        Status <span v-if="entitySortColumn === 'status'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                    </th>
                                    <th class="text-center">Aktion</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="entity in sortedEntities" :key="entity.id" :data-entity-name="entity.name" class="hover:bg-base-200/50">
                                    <td class="font-medium max-w-[150px] truncate cursor-pointer hover:text-primary" :title="entity.name + ' – klicken um im Text zu scrollen'" v-html="formatEntityName(entity)" @click.stop="scrollToNextTokenForEntity(entity.name)"></td>
                                    <td>
                                        <select
                                            class="select select-bordered select-xs text-[10px] h-6 min-h-6 px-2 w-full max-w-[100px]"
                                            :value="entity.type"
                                            @change="changeEntityCategory(entity.name, $event.target.value)"
                                        >
                                            <option v-for="label in availableLabels" :key="label" :value="label">{{ formatLabel(label) }}</option>
                                        </select>
                                    </td>
                                    <td class="font-mono text-xs text-base-content/70 select-all">{{ getActualPlaceholder(entity) }}</td>
                                    <td>
                                        <span :class="getEntityStatus(entity).class" class="text-xs font-semibold">{{ getEntityStatus(entity).label }}</span>
                                    </td>
                                    <td class="text-center">
                                        <button
                                            v-if="!entity.isManual"
                                            @click="toggleSessionRemovedEntity(entity.name)"
                                            class="btn btn-ghost btn-xs btn-square"
                                            :class="sessionRemovedEntities.includes(entity.name) ? 'text-success' : 'text-error'"
                                            :title="sessionRemovedEntities.includes(entity.name) ? 'Anonymisierung wieder aktivieren' : 'Diese Entität ausschliessen'"
                                        >
                                            <XMarkIcon v-if="!sessionRemovedEntities.includes(entity.name)" class="w-4 h-4" />
                                            <ArrowPathIcon v-else class="w-4 h-4" />
                                        </button>
                                        <button
                                            v-else
                                            @click="removeManualEntity(entity.name)"
                                            class="btn btn-ghost btn-xs btn-square text-error"
                                            title="Manuelle Anonymisierung entfernen"
                                        >
                                            <XMarkIcon class="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <!-- Words Panel (footer) -->
                    <div v-if="showWordsPanel" class="w-64 flex-shrink-0 overflow-auto p-3">
                        <div class="flex flex-wrap gap-2">
                            <button
                                v-for="item in uniqueAnonymizedWords"
                                :key="item.word"
                                @click="addToExclusionList(item.word)"
                                class="px-2 py-1 text-xs rounded-full border transition-all"
                                :class="item.isInExclusionList
                                    ? 'bg-warning text-warning-content border-warning hover:bg-warning/80 cursor-pointer line-through'
                                    : 'bg-base-100 text-base-content border-base-300 hover:bg-primary hover:text-primary-content hover:border-primary cursor-pointer'"
                            >
                                {{ item.word }}<span v-if="item.isInExclusionList" class="ml-1">✓</span>
                            </button>
                        </div>
                        <p v-if="uniqueAnonymizedWords.length === 0" class="text-sm text-base-content/50 italic">
                            Keine Wörter anonymisiert
                        </p>
                    </div>
                </div>
            </div>
        </main>

        <!-- Test Preview Modal -->
        <div
            v-if="showTestModal"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            @click.self="closeTestModal"
        >
            <div class="bg-base-100 rounded-lg shadow-xl max-w-[95vw] w-full mx-4 max-h-[95vh] flex flex-col">
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
                    <div class="flex items-center gap-2 sm:gap-4">
                        <label v-if="testPreviewResult" class="cursor-pointer flex items-center gap-2 border-r border-base-300 pr-2 sm:pr-4">
                            <span class="text-xs font-semibold text-base-content/70 hidden sm:inline">gerichtsüblich</span>
                            <span class="text-xs font-semibold text-base-content/70 sm:hidden">Gericht</span>
                            <input
                                type="checkbox"
                                v-model="courtStyle"
                                @change="handleCourtStyleChange"
                                class="toggle toggle-sm toggle-primary"
                                title="Gerichtsübliche Anonymisierung (A.________) aktivieren"
                            >
                        </label>
                        <div class="flex items-center gap-2">
                             <button
                                v-if="testPreviewResult"
                                @click="downloadTestResult"
                                class="btn btn-ghost btn-sm"
                                title="Anonymisierten Text herunterladen"
                            >
                                <ArrowDownTrayIcon class="w-5 h-5 mr-2 hidden sm:inline" />
                                <span class="hidden sm:inline">Download</span>
                                <ArrowDownTrayIcon class="w-5 h-5 sm:hidden" />
                            </button>
                            <button @click="closeTestModal" class="btn btn-ghost btn-sm btn-square">
                                <XMarkIcon class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modal Body -->
                <div ref="modalBody" class="px-6 py-4 overflow-y-auto flex-1">
                    <!-- Loading State -->
                    <div v-if="testPreviewLoading && !testPreviewAdjusting" class="flex items-center justify-center py-12">
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
                            ref="previewContainer"
                            class="p-4 border border-base-300 rounded-lg bg-base-200/50
                                   whitespace-pre-wrap font-mono text-sm leading-relaxed max-h-[65vh] overflow-y-auto cursor-text [&_p]:mb-4 [&_h1]:mb-4 [&_h2]:mb-4 [&_h3]:mb-4 [&_ul]:mb-4 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:ml-4 [&_ol]:list-decimal"
                            v-html="highlightedAnonymizedText"
                            @mouseover="handleTextMouseOver"
                            @mouseout="handleTextMouseOut"
                            @mousemove="handleTextMouseMove"
                            @mouseup="handleTextSelection"
                            @click="handleTokenClick"
                        ></div>

                        <!-- Custom Tooltip -->
                        <div
                            v-if="hoverTooltip.visible"
                            class="fixed z-[100] px-3 pt-2 pb-2 text-xs font-medium text-base-content bg-base-300 border border-base-200 rounded shadow-xl transform -translate-x-1/2 -translate-y-full flex flex-col gap-2 min-w-[220px]"
                            :class="hoverTooltip.isPinned ? 'ring-2 ring-primary border-primary shadow-2xl transition-all duration-200' : ''"
                            :style="tooltipStyle"
                            @mouseenter="handleTooltipMouseEnter"
                            @mouseleave="handleTooltipMouseLeave"
                        >
                            <!-- Unpin Button -->
                            <button 
                                v-if="hoverTooltip.isPinned"
                                @click.stop="unpinTooltip"
                                class="absolute top-1 right-1 btn btn-ghost btn-xs btn-square text-gray-400 hover:text-white"
                                title="Anheften aufheben"
                            >
                                <XMarkIcon class="w-3 h-3" />
                            </button>

                            <!-- Actions (Only when pinned) -->
                            <div v-if="hoverTooltip.isPinned" class="flex flex-col gap-2 pr-6 mt-1">
                                <!-- Merge (Zusammenlegen) for court style -->
                                <!-- Entity this one is merged WITH -->
                                <div v-if="courtEntityMappings[hoverTooltip.entityName]" class="bg-base-200 p-2 rounded text-xs text-base-content border border-base-300 mb-2">
                                    <div class="font-bold mb-1">Zusammengelegt auf:</div>
                                    <div class="flex justify-between items-center gap-2">
                                        <span class="truncate">{{ courtEntityMappings[hoverTooltip.entityName] }}</span>
                                        <button @click.stop="unmergeEntity(hoverTooltip.entityName)" class="btn btn-xs btn-ghost btn-square text-error" title="Zusammenlegen aufheben">
                                            <XMarkIcon class="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                <!-- Entities merged INTO this one -->
                                <div v-if="getMappedToThis(hoverTooltip.entityName).length > 0" class="bg-base-200 p-2 rounded text-xs text-base-content border border-base-300 mb-2">
                                    <div class="font-bold mb-1">Hiermit zusammengelegt:</div>
                                    <div class="flex flex-col gap-1">
                                        <div v-for="source in getMappedToThis(hoverTooltip.entityName)" :key="source" class="flex justify-between items-center gap-2">
                                            <span class="truncate">{{ source }}</span>
                                            <button @click.stop="unmergeEntity(source)" class="btn btn-xs btn-ghost btn-square text-error" title="Zusammenlegen aufheben">
                                                <XMarkIcon class="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Dropdown to pull/merge more entities here -->
                                <div class="form-control w-full">
                                    <label class="label p-0 pb-1">
                                        <span class="label-text-alt text-base-content/70">
                                            {{ courtEntityMappings[hoverTooltip.entityName] || getMappedToThis(hoverTooltip.entityName).length > 0 ? 'Weitere Entität zusammenlegen:' : 'Entität hiermit zusammenlegen:' }}
                                        </span>
                                    </label>
                                    <select 
                                        class="select select-bordered select-xs w-full text-base-content" 
                                        @change="mergeEntity($event.target.value, hoverTooltip.entityName); $event.target.value = ''"
                                    >
                                        <option value="" disabled selected>Entität auswählen...</option>
                                        <option 
                                            v-for="target in getMergeSuggestions(hoverTooltip.entityName, hoverTooltip.entityType)" 
                                            :key="target.name" 
                                            :value="target.name"
                                        >
                                            {{ target.isRecommended ? '★ ' : '' }}{{ target.name }}{{ target.isRecommended ? ' (empfohlen)' : '' }}
                                        </option>
                                    </select>
                                </div>
                                <div v-if="courtStyle && (hoverTooltip.entityType === 'person' || hoverTooltip.entityType === 'organization')" class="border-t border-base-content/20 my-1"></div>

                                <!-- Change Category -->
                                <div class="form-control w-full my-1">
                                    <label class="label p-0 pb-1">
                                        <span class="label-text-alt text-base-content/70">Kategorie ändern:</span>
                                    </label>
                                    <select 
                                        class="select select-bordered select-xs w-full text-base-content" 
                                        :value="hoverTooltip.entityType"
                                        @change="changeEntityCategory(hoverTooltip.entityName, $event.target.value)"
                                    >
                                        <option value="" disabled>Bitte wählen...</option>
                                        <option v-for="label in availableLabels" :key="label" :value="label">
                                            {{ formatLabel(label) }}
                                        </option>
                                    </select>
                                </div>
                                <div class="border-t border-base-content/20 my-1"></div>

                                <!-- Surgical Word Buttons -->
                                <div class="flex flex-wrap gap-1">
                                    <button 
                                        v-for="word in getSurgicalWords(hoverTooltip.entityName)"
                                        :key="word"
                                        @click="addToExclusionList(word)"
                                        class="btn btn-[10px] h-auto min-h-0 py-1 px-2 btn-outline gap-1"
                                        :class="isWordExcluded(word) 
                                            ? 'bg-warning text-warning-content border-warning hover:bg-warning/80 line-through' 
                                            : 'btn-warning'"
                                        :title="isWordExcluded(word)
                                            ? 'Klicken um \'' + word + '\' von der Negativliste zu entfernen'
                                            : 'Klicken um \'' + word + '\' zur Negativliste hinzuzufügen'"
                                    >
                                        <NoSymbolIcon v-if="!isWordExcluded(word)" class="w-3 h-3" />
                                        <CheckIcon v-else class="w-3 h-3" />
                                        {{ word }}
                                    </button>
                                </div>
                                
                                <button 
                                    @click="toggleSessionRemovedEntity(hoverTooltip.entityName)"
                                    class="btn btn-xs btn-outline btn-error w-full gap-1 text-[10px]"
                                    :title="'Ganze Entität \'' + hoverTooltip.entityName + '\' ignorieren'"
                                >
                                    <XMarkIcon class="w-3 h-3" />
                                    Ganze Entität ignorieren
                                </button>
                            </div>
                            
                            <div :class="hoverTooltip.isPinned ? 'border-t border-base-content/20 pt-1 mt-1' : ''">
                                Original: <span class="font-bold text-primary-focus" v-html="hoverTooltip.text"></span>
                                <span v-if="hoverTooltip.isPinned" class="ml-2 text-[8px] uppercase tracking-widest text-primary opacity-70">Angeheftet</span>
                            </div>
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
                            <span class="px-2 py-1 bg-gray-200 text-gray-900 rounded border border-gray-400">manuell</span>
                            <span class="text-base-content/40 ml-2 italic">Hover zeigt Original, Markieren zum Anonymisieren</span>
                        </div>

                        <!-- Selection Hover Menu -->
                        <div
                            v-if="selectionMenu.visible"
                            class="fixed z-[110] bg-base-100 rounded-lg shadow-2xl border border-primary/20 p-1 flex items-center gap-1 animate-in fade-in zoom-in duration-150"
                            :style="{ top: selectionMenu.y + 'px', left: Math.max(108, Math.min(window.innerWidth - 108, selectionMenu.x)) + 'px', transform: 'translate(-50%, -120%)' }"
                            @mousedown.stop
                        >
                            <button
                                v-if="selectionMenu.step === 1"
                                @click="selectionMenu.step = 2"
                                class="btn btn-primary btn-xs normal-case gap-1"
                            >
                                <TagIcon class="w-3 h-3" />
                                Markierte Stelle anonymisieren?
                            </button>
                            <div v-else class="flex flex-col gap-1 p-2 min-w-[200px]">
                                <span class="text-xs font-bold text-base-content/70">Kategorie auswählen:</span>
                                <select v-model="selectionMenu.selectedCategory" class="select select-bordered select-xs w-full">
                                    <option value="" disabled selected>Bitte wählen...</option>
                                    <option v-for="label in availableLabels" :key="label" :value="label">
                                        {{ formatLabel(label) }}
                                    </option>
                                </select>
                                <div class="flex justify-end gap-1 mt-1">
                                    <button
                                        @click="cancelManualEntityAdding"
                                        class="btn btn-ghost btn-xs"
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        @click="addManualEntity"
                                        class="btn btn-primary btn-xs"
                                        :disabled="!selectionMenu.selectedCategory"
                                    >
                                        Speichern
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Anonymized Words List - Click to exclude -->
                        <div class="mt-6 p-4 bg-base-200 rounded-lg">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-semibold text-sm">Anonymisierte Wörter</h4>
                                <span class="text-xs text-base-content/60">
                                    Klicken um zur Negativliste hinzuzufügen oder von der Negativliste entfernen
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
                                            <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('name')">
                                                Original <span v-if="entitySortColumn === 'name'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                            </th>
                                            <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('type')">
                                                Typ <span v-if="entitySortColumn === 'type'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                            </th>
                                            <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('placeholder')">
                                                Platzhalter <span v-if="entitySortColumn === 'placeholder'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                            </th>
                                            <th class="cursor-pointer hover:bg-base-300 select-none" @click="sortBy('status')">
                                                Status <span v-if="entitySortColumn === 'status'">{{ entitySortDirection === 'asc' ? '↑' : '↓' }}</span>
                                            </th>
                                            <th class="text-center">Aktion</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="entity in sortedEntities" :key="entity.id" class="hover:bg-base-200/50">
                                            <td class="font-medium max-w-[200px] truncate" :title="entity.name" v-html="formatEntityName(entity)"></td>
                                            <td>
                                                <select 
                                                    class="select select-bordered select-xs text-[10px] h-6 min-h-6 px-2 w-full max-w-[120px]" 
                                                    :value="entity.type"
                                                    @change="changeEntityCategory(entity.name, $event.target.value)"
                                                >
                                                    <option v-for="label in availableLabels" :key="label" :value="label">
                                                        {{ formatLabel(label) }}
                                                    </option>
                                                </select>
                                            </td>
                                            <td class="font-mono text-xs text-base-content/70 select-all">
                                                {{ getActualPlaceholder(entity) }}
                                            </td>
                                            <td>
                                                <span :class="getEntityStatus(entity).class" class="text-xs font-semibold">
                                                    {{ getEntityStatus(entity).label }}
                                                </span>
                                            </td>
                                            <td class="text-center">
                                                <button
                                                    v-if="!entity.isManual"
                                                    @click="toggleSessionRemovedEntity(entity.name)"
                                                    class="btn btn-ghost btn-xs btn-square"
                                                    :class="sessionRemovedEntities.includes(entity.name) ? 'text-success' : 'text-error'"
                                                    :title="sessionRemovedEntities.includes(entity.name) ? 'Anonymisierung wieder aktivieren' : 'Diese Entität von der Anonymisierung ausschliessen'"
                                                >
                                                    <XMarkIcon v-if="!sessionRemovedEntities.includes(entity.name)" class="w-4 h-4" />
                                                    <ArrowPathIcon v-else class="w-4 h-4" />
                                                </button>
                                                <button
                                                    v-else
                                                    @click="removeManualEntity(entity.name)"
                                                    class="btn btn-ghost btn-xs btn-square text-error"
                                                    title="Manuelle Anonymisierung entfernen"
                                                >
                                                    <XMarkIcon class="w-4 h-4" />
                                                </button>
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
                        Schliessen
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
    CheckIcon,
    ExclamationCircleIcon,
    ClockIcon,
    AdjustmentsHorizontalIcon,
    NoSymbolIcon,
    Cog6ToothIcon,
    MagnifyingGlassIcon,
    SignalIcon,
    ArrowPathIcon,
    ChevronDownIcon
} from '@heroicons/vue/24/outline';

import JSZip from 'jszip';
import { processFile, validateFile, getFileNameWithoutExtension, SUPPORTED_EXTENSIONS } from '../utils/fileProcessor.js';
import anonymizerService, { AVAILABLE_LABELS, DEFAULT_SELECTED_LABELS } from '../utils/anonymizer.js';
import iframeAnonymizer from '../utils/iframeAnonymizer.js';
import modelCache from '../utils/modelCache.js';

const DEFAULT_EXCLUSION_LIST = "Urteil; Beschluss; Verfügung; Art.; Abs.; lit.; SchKG; OR; ZPO; StGB; StPO; VRG; VwVG; AIG; BetmG; ZGB; SVG; §; §§; Kanton; Kantons; Gerichtschreiberin; Gerichtsschreiber; Rekurs; Rekurrent; Rekurrentin; Rekurrenten; Klägerin; Kläger; Klage; Klägerschaft; Beklagte; Beklagter; Gesuchsteller; Gesuchstellers; Gesuchstellerin; Beschwerdeführer; Beschwerdeführerin; Beschwerde; Beschwerdeschrift; Präsident; Präsidentin; Präsidenten; Privatkläger; Privatklägers; Privatklägerin; Privatklägerinnen; Privatklägerschaft; Beschuldigte; Beschuldigter; Beschuldigten; Angeklagter; Angeklagte; Angeklagten; Person; Personen; Verteidiger; Verteidigerin; Verteidigers; Verteidigung; Bezirksgericht; Bezirksrichterin; BZGer; Bezirksrichter; Arbeitsgericht; Arbeitsgerichts; Kriminalrichter; KG; Kriminalrichterin; Kantonsrichterin; Kantonsrichter; Bezirksgerichts; Kantonsgericht; Kantonsgerichts; Obergericht; Obergerichts; OGer; Kriminalgericht; Kriminalgerichts; KGer; Täter; Täterin; Täters; Polizei; Kantonspolizei; Polizist; Polizistin; Polizisten; Polizeibeamte; Polizeibeamter; Polizeibeamten; Vollzugsbehörde; Strafbehörden; Behörden; Oberstaatsanwaltschaft; Staatsanwaltschaft; Staatsanwalt; Staatsanwältin; BGE; BGer; Bundesgerichts; Bundesgerichtes; Bundesgericht; Abteilung; Rechtsanwalt; Rechtsanwalts; Rechtsanwältin; Rechtsanwältinnen; Rechtsanwälte; RA; Eigentümer; Eigentümerin; Besitzer; Besitzerin; Arbeitgeber; Arbeitgeberin; Angestellter; Angestellte; Angestellten; Mitarbeiter; Mitarbeiterin; Mitarbeiterinnen; Schuldner; Schuldnerin; Gläubigerin; Gläubiger; Geschädigte; Geschädigter; Geschädigten; Auskunftsperson; Zeugin; Zeuge; Zeugen; der; die; das; von; vom; und; für; als; zu; ein; in; im; am; zu; einer; eine; dies; dieser; diese; Schwester; Bruder; Sohn; Tochter; Familie; Mutter; Vater; Ehemann; Ehehfrau; Ehepartner; Ehegatten; er; sie; ihr; ihre; ihren; ihres; seine; seinen; seines; Partner; Partnerin; Partners; Partnerinnen; Auto; Stadt; E-Mail; E-Mails; eMail; eMails; Mail; Mails; Strassenverkehrsamt; Strafregister; Friedensrichter; Friedensrichterin; Friedensrichters; Friedensrichteramt; Friedensrichteramts; Beil.; Bel.; fl.Akten; Akten; UA; bp; /; 1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12";

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
        CheckIcon,
        ExclamationCircleIcon,
        ClockIcon,
        AdjustmentsHorizontalIcon,
        NoSymbolIcon,
        Cog6ToothIcon,
        MagnifyingGlassIcon,
        SignalIcon,
        ArrowPathIcon,
        ChevronDownIcon
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
            testPreviewDetectedEntities: null, // Cache for detected entities
            testPreviewCachedParams: {        // Cache key parameters
                file: null,
                threshold: 0,
                labels: []
            },
            isFullTest: false,
            testPreviewAdjusting: false,
            hoveredFileIndex: null,

            // Tooltip state
            hoverTooltip: {
                visible: false,
                x: 0,
                y: 0,
                text: '',
                entityName: '',
                entityType: '',
                word: '',
                isPinned: false
            },
            hideTooltipTimeout: null,
            isHoveringTooltip: false,

            // Anonymization options
            convertWordToMarkdown: true,
            courtStyle: false,
            anonymizeFilenames: true,
            sessionRemovedEntities: [],
            courtEntityMappings: {},
            
            // Manual selection / Hover menu
            manualEntities: [], // List of objects { word: '', category: '' } manually marked for anonymization
            selectionMenu: {
                visible: false,
                x: 0,
                y: 0,
                selectedText: '',
                step: 1,
                selectedCategory: ''
            },
            
            // Entity table sorting
            entitySortColumn: 'name',
            entitySortDirection: 'asc',

            // View mode
            viewMode: new URLSearchParams(window.location.search).get('mode') === 'batch' ? 'batch' : 'single', // 'batch' | 'single'
            singleFileDragOver: false,
            showEntityPanel: false,
            showWordsPanel: false,
            panelsInFooter: false,
            entityScrollIndex: {}

        };
    },
    mounted() {
        window.addEventListener('mousedown', this.hideSelectionMenu);
        this.loadExclusionList();
    },
    beforeUnmount() {
        window.removeEventListener('mousedown', this.hideSelectionMenu);
    },
    computed: {
        tooltipStyle() {
            const HALF_W = 120; // conservative estimate (min-w-[220px] / 2 + padding)
            const MARGIN = 8;
            const x = Math.max(HALF_W + MARGIN, Math.min(window.innerWidth - HALF_W - MARGIN, this.hoverTooltip.x));
            return { top: (this.hoverTooltip.y - 4) + 'px', left: x + 'px' };
        },
        // True when the preview result is active (either in modal or single-file mode)
        isPreviewActive() {
            return (this.showTestModal || this.viewMode === 'single') && !!this.testPreviewResult;
        },
        // True when the current single-file is a Word document
        isDocxFile() {
            if (!this.testPreviewFile) return false;
            const name = this.testPreviewFile.name.toLowerCase();
            return name.endsWith('.docx') || name.endsWith('.doc');
        },
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
            if (this.testPreviewResult.displayAnonymizedHtml) {
                text = this.testPreviewResult.displayAnonymizedHtml;
            } else {
                text = this.escapeHtml(this.testPreviewResult.displayAnonymizedText);
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
                'time': 'background-color: #fed7aa; color: #7c2d12;',
                'manual': 'background-color: #e5e7eb; color: #111827;'
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
                            // The anonymizer uses: split(/[\s,;-]+/) which consumes delimiters.
                            
                            // Let's try to just split by space/hyphen/comma/semicolon to find the word, but we need to reconstruct the string with delimiters...
                            // Actually, let's just use a simple split/join approach for visual representation.
                            // If we can't perfectly reconstruct separators, spaces are usually fine for the tooltip.
                             
                            const words = originalValue.split(/([\s,;-]+)/);
                            // The split above with capturing group keeps separators.
                            // e.g. "Hans-Peter" -> ["Hans", "-", "Peter"]
                            // e.g. "Hans Peter" -> ["Hans", " ", "Peter"]
                            // e.g. "Hans   Peter" -> ["Hans", "   ", "Peter"]
                            
                            // We need to count "real" words to match the index
                            let currentWordCount = 0;
                            let specificWordFound = '';
                            const markedParts = words.map(part => {
                                // Check if this part is a "word" (not only whitespace/separator)
                                if (part.trim().length > 0 && !/^[\s,;-]+$/.test(part)) {
                                    if (currentWordCount === wordIndex) {
                                        currentWordCount++;
                                        specificWordFound = part;
                                        return `<span style="text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 2px;">${part}</span>`;
                                    }
                                    currentWordCount++;
                                }
                                return part;
                            });
                            
                            originalHtml = markedParts.join('');
                            if (specificWordFound) {
                                // Store it in a way we can retrieve it
                            }
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
                
                // Get the specific word if available
                let specificWord = originalValue;
                if (typeof specificWordFound !== 'undefined' && specificWordFound) {
                    specificWord = specificWordFound;
                }

                return `<span class="anonymized-token" data-entity-id="${id}" data-entity-type="${normalizedType}" data-original="${escapedOriginal}" data-specific-word="${specificWord.replace(/"/g, '&quot;')}" data-original-html="${encodedOriginalHtml}" style="${style} padding: 1px 4px; border-radius: 3px; font-weight: 600; cursor: help;">${displayString}</span>`;
            });

            // Highlight words skipped due to exclusion list (appear in multi-word entities but not anonymized)
            const exclRegex = /\[\[excl:([^\]]+)\]\]/g;
            text = text.replace(exclRegex, (_match, word) => {
                return `<span class="exclusion-list-word" title="Nicht anonymisiert (Negativliste)" style="text-decoration: underline; text-decoration-color: #ca8a04; text-decoration-thickness: 2px; text-underline-offset: 3px; cursor: default;">${word}</span>`;
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
                const entityWords = entity.name.split(/[\s,;-]+/).filter(w => w.trim().length > 0);

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
            const exclusionList = this.parseExclusionList();

            // Filter out entities where ALL components are in the blocklist
            const filteredEntities = this.testPreviewResult.entities.filter(entity => {
                if (!this.isAllComponentsInBlocklist(entity, exclusionList)) {
                    return true;
                }
                return false;
            });

            return [...filteredEntities].sort((a, b) => {
                let valA, valB;

                if (this.entitySortColumn === 'name') {
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                } else if (this.entitySortColumn === 'type') {
                    valA = a.type.toLowerCase();
                    valB = b.type.toLowerCase();
                } else if (this.entitySortColumn === 'placeholder') {
                    valA = this.getActualPlaceholder(a).toLowerCase();
                    valB = this.getActualPlaceholder(b).toLowerCase();
                } else if (this.entitySortColumn === 'status') {
                    valA = this.getEntityStatus(a).label.toLowerCase();
                    valB = this.getEntityStatus(b).label.toLowerCase();
                } else {
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                }

                if (valA < valB) return this.entitySortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.entitySortDirection === 'asc' ? 1 : -1;
                return 0;
            });
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
        sortBy(column) {
            if (this.entitySortColumn === column) {
                this.entitySortDirection = this.entitySortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.entitySortColumn = column;
                this.entitySortDirection = 'asc';
            }
        },
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
            const defaultWords = DEFAULT_EXCLUSION_LIST.split(';').map(w => w.trim()).filter(w => w.length > 0);
            
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
                this.exclusionList = currentWords.join('; ');
                this.saveExclusionList();
            }
        },
        parseExclusionList() {
            if (!this.exclusionList || this.exclusionList.trim() === '') {
                return [];
            }
            return this.exclusionList
                .split(/[;,]/)
                .map(word => word.trim())
                .filter(word => word.length > 0);
        },
        getEntityStatus(entity) {
            // Check session removed list (highest priority)
            // Use case-insensitive and trimmed comparison
            const cleanEntityName = entity.name.trim().toLowerCase();
            if (this.sessionRemovedEntities.some(name => name.trim().toLowerCase() === cleanEntityName)) {
                 return { code: 'removed', label: 'Gelöscht (Sitzung)', class: 'text-error' };
            }

            // Check exclusion list
            const exclusionList = this.parseExclusionList();
            if (exclusionList.length > 0) {
                 const entityWords = entity.name.toLowerCase().split(/[\s,;-]+/);
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
        isAllComponentsInBlocklist(entity, exclusionList) {
            const entityWords = entity.name.toLowerCase().split(/[\s,;-]+/).filter(word => word.length > 0);
            if (entityWords.length === 0) return false;

            const exclusionListLower = exclusionList.map(word => word.toLowerCase());
            return entityWords.every(word => exclusionListLower.includes(word));
        },
        toggleSessionRemovedEntity(name) {
            const cleanName = name.trim().toLowerCase();
            const index = this.sessionRemovedEntities.findIndex(n => n.trim().toLowerCase() === cleanName);
            
            if (index > -1) {
                this.sessionRemovedEntities.splice(index, 1);
            } else {
                this.sessionRemovedEntities.push(name);
            }
            
            // Re-run preview test if currently in preview modal
            if (this.isPreviewActive) {
                // Set adjusting flag to true so the modal doesn't clear/flicker
                this.testPreviewAdjusting = true;
                this.testAnonymization(this.testPreviewFile, this.isFullTest);
            }
        },
        getActualPlaceholder(entity) {
            if (!this.courtStyle) {
                return `[${entity.id}_${entity.type.toLowerCase()}]`;
            }
            
            const type = entity.type ? entity.type.toLowerCase() : '';
            if (type === 'person' || type === 'organization' || type === 'organisation') {
                const courtId = entity.courtId || '________';
                let suffixStr = '';
                if ((type === 'organization' || type === 'organisation') && entity.name) {
                    const words = entity.name.split(/[\s,;-]+/).filter(w => w && w.trim().length > 0);
                    const suffixes = ['AG', 'GmbH', 'SA', 'Genossenschaft', 'Kollektivgesellschaft', 'Kommanditgesellschaft', 'Verein', 'Stiftung', 'Inc', 'Corp', 'LLC', 'Ltd', 'SE'];
                    const lastWord = words[words.length - 1];
                    if (lastWord && suffixes.some(s => s.toLowerCase() === lastWord.toLowerCase())) {
                        const isExcluded = this.parseExclusionList().map(w => w.toLowerCase()).includes(lastWord.toLowerCase());
                        // Using entity.isManual to match anonymizer.js check
                        if (!entity.isManual && isExcluded) {
                            suffixStr = '';
                        } else {
                            suffixStr = ' ' + lastWord;
                        }
                    }
                }
                return courtId + suffixStr;
            }
            return '________';
        },
        addToExclusionList(word) {
            if (!word || typeof word !== 'string' || word.trim() === '') return;

            const cleanWord = word.trim();
            const currentExclusions = this.parseExclusionList();
            
            const existingIndex = currentExclusions.findIndex(
                excl => excl.toLowerCase() === cleanWord.toLowerCase()
            );

            if (existingIndex >= 0) {
                // Remove word
                currentExclusions.splice(existingIndex, 1);
            } else {
                // Add word
                currentExclusions.push(cleanWord);
            }

            // Re-join with primary delimiter (semicolon)
            this.exclusionList = currentExclusions.join('; ');

            // Save to localStorage
            this.saveExclusionList();
            
            // Re-run preview test if currently in preview modal
            // Use $nextTick to ensure exclusionList update is propagated
            this.$nextTick(() => {
                if (this.isPreviewActive) {
                    this.testPreviewAdjusting = true;
                    this.testAnonymization(this.testPreviewFile, this.isFullTest);
                }
            });
        },

        handleCourtStyleChange() {
            // Re-run preview test if currently in preview modal when court style changes
            if (this.isPreviewActive) {
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

        // Helper to check if a word is in the exclusion list
        isWordExcluded(word) {
            if (!word) return false;
            const currentExclusions = this.parseExclusionList();
            return currentExclusions.some(excl => excl.toLowerCase() === word.trim().toLowerCase());
        },

        // Helper to get individual words for the hover menu
        getSurgicalWords(fullName) {
            if (!fullName) return [];
            return fullName.split(/[\s,;-]+/).filter(w => w.trim().length > 0);
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
        async anonymizeFile(file, options = {}) {
            const { 
                truncateLimit = null, 
                includeHtml = false,
                preDetectedEntities = null, // Allow passing already detected entities
                isPreview = false
            } = options;

            // Extract text from file
            const result = await processFile(file, { convertWordToMarkdown: this.convertWordToMarkdown });
            if (!result.success) {
                throw new Error(result.error);
            }

            const fullText = result.text;
            let processingText = fullText;
            let processingHtml = includeHtml ? (result.html || null) : null;

            // Truncate if requested (for previews)
            if (truncateLimit && fullText.length > truncateLimit) {
                processingText = fullText.slice(0, truncateLimit);
                const lastSpace = processingText.lastIndexOf(' ');
                if (lastSpace > 0) {
                    processingText = processingText.slice(0, lastSpace) + '...';
                }
                if (processingHtml) {
                    processingHtml = this.truncateHtml(processingHtml, truncateLimit);
                }
            }

            // Detect entities (use pre-detected if available, otherwise detect)
            let entities = [];
            if (preDetectedEntities) {
                // Deep copy to avoid mutating the cache
                entities = JSON.parse(JSON.stringify(preDetectedEntities));
            } else {
                entities = await iframeAnonymizer.detectEntities(
                    processingText,
                    this.selectedLabels,
                    this.threshold
                );
            }

            // Add manual entities
            this.manualEntities.forEach(manualEntity => {
                const cleanManualName = manualEntity.word.trim();
                const existingEntity = entities.find(e => e.name.toLowerCase() === cleanManualName.toLowerCase());
                
                if (existingEntity) {
                    // Force type to selected category if it was found by GLiNER but manually marked too
                    existingEntity.type = manualEntity.category;
                    existingEntity.isManual = true;
                } else {
                    entities.push({
                        id: entities.length + 1,
                        name: cleanManualName,
                        type: manualEntity.category,
                        isManual: true
                    });
                }
            });

            // Filter out entities removed in this session
            // Use case-insensitive and trimmed comparison
            const sessionFilteredEntities = entities.filter(entity => {
                const cleanEntityName = entity.name.trim().toLowerCase();
                return !this.sessionRemovedEntities.some(removed => 
                    removed.trim().toLowerCase() === cleanEntityName
                );
            });

            // Get current exclusion list
            const exclusionList = this.parseExclusionList();

            // Anonymize plain text
            const anonymizerOptions = {
                anonymizePartialWords: this.anonymizePartialWords,
                minCharacterThreshold: this.minCharacterThreshold,
                exclusionList: exclusionList,
                courtStyle: this.courtStyle,
                courtEntityMappings: this.courtEntityMappings
            };

            const anonymizedText = anonymizerService.anonymizeText(processingText, sessionFilteredEntities, {
                ...anonymizerOptions,
                testPreviewMode: false
            });

            // For previews, we also need a tagged version for the highlighting system
            let displayAnonymizedText = anonymizedText;
            if (isPreview) {
                displayAnonymizedText = anonymizerService.anonymizeText(processingText, sessionFilteredEntities, {
                    ...anonymizerOptions,
                    testPreviewMode: true
                });
            }

            // Anonymize HTML if requested
            let anonymizedHtml = null;
            let displayAnonymizedHtml = null;
            if (processingHtml) {
                anonymizedHtml = anonymizerService.anonymizeText(processingHtml, sessionFilteredEntities, {
                    ...anonymizerOptions,
                    testPreviewMode: false
                });
                
                if (isPreview) {
                    displayAnonymizedHtml = anonymizerService.anonymizeText(processingHtml, sessionFilteredEntities, {
                        ...anonymizerOptions,
                        testPreviewMode: true
                    });
                } else {
                    displayAnonymizedHtml = anonymizedHtml;
                }
            } else {
                displayAnonymizedHtml = null;
            }

            return {
                originalText: processingText,
                originalHtml: processingHtml,
                anonymizedText,
                displayAnonymizedText,
                anonymizedHtml,
                displayAnonymizedHtml,
                entities,
                sessionFilteredEntities,
                exclusionList,
                fullTextLength: fullText.length
            };
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
                let outputName = baseName + ext;
                
                if (this.anonymizeFilenames) {
                    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
                    outputName = `anon-text-${randomNum}${ext}`;
                }

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
                    const result = await this.anonymizeFile(outputFile.inputFile, { includeHtml: false });
                    
                    outputFile.content = result.anonymizedText;
                    outputFile.entitiesFound = result.entities.length;
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
            
            // Save scroll position before we start if we're adjusting
            let savedPreviewScroll = 0;
            let savedModalScroll = 0;
            if (this.testPreviewAdjusting) {
                if (this.viewMode === 'single') {
                    if (this.$refs.singlePreviewContainer) savedPreviewScroll = this.$refs.singlePreviewContainer.scrollTop;
                } else {
                    if (this.$refs.previewContainer) savedPreviewScroll = this.$refs.previewContainer.scrollTop;
                    if (this.$refs.modalBody) savedModalScroll = this.$refs.modalBody.scrollTop;
                }
            }

            // Only clear result if we're not just adjusting the current one
            if (!this.testPreviewAdjusting) {
                this.testPreviewResult = null;
            }

            // Only open the modal in batch mode
            if (this.viewMode !== 'single') {
                this.showTestModal = true;
            }

            try {
                // Determine if we can use cached detection results
                const useCache = this.testPreviewDetectedEntities && 
                                 this.testPreviewCachedParams.file === file &&
                                 this.testPreviewCachedParams.threshold === this.threshold &&
                                 this.testPreviewCachedParams.isFullTest === full &&
                                 JSON.stringify(this.testPreviewCachedParams.labels) === JSON.stringify(this.selectedLabels);

                const result = await this.anonymizeFile(file, { 
                    truncateLimit: full ? null : 2000, 
                    includeHtml: true,
                    preDetectedEntities: useCache ? this.testPreviewDetectedEntities : null,
                    isPreview: true
                });

                // Update cache if we performed a new detection
                if (!useCache) {
                    this.testPreviewDetectedEntities = result.entities;
                    this.testPreviewCachedParams = {
                        file: file,
                        threshold: this.threshold,
                        labels: [...this.selectedLabels],
                        isFullTest: full
                    };
                }

                // Calculate statistics for the preview modal
                const excludedEntitiesCount = result.sessionFilteredEntities.filter(entity => {
                    const entityWords = entity.name.toLowerCase().split(/[\s,;-]+/);
                    return entityWords.some(word =>
                        result.exclusionList.some(excl => excl.toLowerCase() === word)
                    );
                }).length;

                let skippedShortEntitiesCount = 0;
                if (this.anonymizePartialWords && this.minCharacterThreshold > 0) {
                    skippedShortEntitiesCount = result.sessionFilteredEntities.filter(entity => {
                        // Check if already excluded by blacklist
                        const entityWords = entity.name.toLowerCase().split(/[\s,;-]+/);
                        const isExcluded = entityWords.some(word =>
                            result.exclusionList.some(excl => excl.toLowerCase() === word)
                        );
                        if (isExcluded) return false;
                        
                        return entity.name.length < this.minCharacterThreshold;
                    }).length;
                }

                // Store result
                this.testPreviewResult = {
                    originalText: result.originalText,
                    anonymizedText: result.anonymizedText, // Clean version for download
                    displayAnonymizedText: result.displayAnonymizedText, // Tagged version for highlights
                    anonymizedHtml: result.anonymizedHtml,
                    displayAnonymizedHtml: result.displayAnonymizedHtml,
                    entities: result.entities,
                    wordCount: result.originalText.split(/\s+/).length,
                    totalWords: result.fullTextLength > 0 ? Math.round((result.fullTextLength / result.originalText.length) * (result.originalText.split(/\s+/).length)) : 0, 
                    exclusionListCount: result.exclusionList.length,
                    excludedEntitiesCount: excludedEntitiesCount,
                    skippedShortEntitiesCount: skippedShortEntitiesCount
                };

                // Restore scroll position
                if (this.testPreviewAdjusting) {
                    this.$nextTick(() => {
                        if (this.viewMode === 'single') {
                            if (this.$refs.singlePreviewContainer) {
                                this.$refs.singlePreviewContainer.scrollTop = savedPreviewScroll;
                            }
                        } else {
                            if (this.$refs.previewContainer) {
                                this.$refs.previewContainer.scrollTop = savedPreviewScroll;
                            }
                            if (this.$refs.modalBody) {
                                this.$refs.modalBody.scrollTop = savedModalScroll;
                            }
                        }
                    });
                }

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
            let fileName = `${baseName}_preview_anonymized${ext}`;

            if (this.anonymizeFilenames) {
                const randomNum = Math.floor(10000000 + Math.random() * 90000000);
                fileName = `anon-text-${randomNum}_preview_anonymized${ext}`;
            }

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
            this.hoverTooltip.isPinned = false;
        },

        getMergeSuggestions(entityName, entityType) {
            if (!this.testPreviewResult || !this.testPreviewResult.entities || !entityName || !entityType) return [];
            
            const words = entityName.toLowerCase().split(/[\s,;-]+/).filter(w => w.length > 0);
            const nameLower = entityName.toLowerCase();
            const nameCanonical = this.getCanonicalNameForUI(entityName);
            const exclusionList = this.parseExclusionList().map(excl => excl.toLowerCase());
            
            let targets = new Set();
            this.testPreviewResult.entities.forEach(e => {
                const targetName = e.name;
                const targetType = e.type ? e.type.toLowerCase() : '';
                
                // Only suggest entities of the same type and not already grouped with the current entity
                if (targetType === entityType.toLowerCase()) {
                    const targetCanonical = this.getCanonicalNameForUI(targetName);
                    // Prevent circular mapping and don't list entities already merged together
                    if (nameCanonical !== targetCanonical) {
                        // Check if the entity is fully in the negative list (and not manual)
                        const targetWords = targetName.split(/[\s,;-]+/).filter(w => w.length > 0);
                        const isFullyExcluded = e.type !== 'manual' && targetWords.length > 0 && targetWords.every(w => exclusionList.includes(w.toLowerCase()));
                        
                        if (!isFullyExcluded) {
                            targets.add(targetName);
                        }
                    }
                }
            });

            // Helper to check for common substring of length >= 3
            const hasCommonSubstring = (str1, str2, minLength = 3) => {
                if (!str1 || !str2 || str1.length < minLength || str2.length < minLength) return false;
                for (let i = 0; i <= str1.length - minLength; i++) {
                    const sub = str1.substring(i, i + minLength);
                    if (str2.includes(sub)) return true;
                }
                return false;
            };
            
            return Array.from(targets).sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                
                // 1. Exact Substring match
                const aContains = aLower.includes(nameLower) || nameLower.includes(aLower);
                const bContains = bLower.includes(nameLower) || nameLower.includes(bLower);
                
                if (aContains && !bContains) return -1;
                if (!aContains && bContains) return 1;
                
                // 2. >= 3 consecutive characters match
                const aHasCommon = hasCommonSubstring(nameLower, aLower, 3);
                const bHasCommon = hasCommonSubstring(nameLower, bLower, 3);

                if (aHasCommon && !bHasCommon) return -1;
                if (!aHasCommon && bHasCommon) return 1;
                
                // 3. Word overlap
                const aWords = aLower.split(/[\s,;-]+/).filter(w => w.length > 0);
                const aShared = words.filter(w => aWords.includes(w)).length;
                
                const bWords = bLower.split(/[\s,;-]+/).filter(w => w.length > 0);
                const bShared = words.filter(w => bWords.includes(w)).length;
                
                if (aShared !== bShared) return bShared - aShared;
                
                // 4. Alphabetical fallback
                return a.localeCompare(b);
            }).map(name => {
                const lower = name.toLowerCase();
                const isExact = lower.includes(nameLower) || nameLower.includes(lower);
                const isSimilar = hasCommonSubstring(nameLower, lower, 3);
                return {
                    name: name,
                    isRecommended: isExact || isSimilar
                };
            });
        },
        getMappedToThis(targetName) {
            return Object.keys(this.courtEntityMappings).filter(source => this.courtEntityMappings[source] === targetName);
        },
        getCanonicalNameForUI(name) {
            let current = name;
            let visited = new Set();
            while (this.courtEntityMappings[current] && !visited.has(current)) {
                visited.add(current);
                current = this.courtEntityMappings[current];
            }
            return current;
        },
        mergeEntity(source, target) {
            if (!source || !target) return;
            this.courtEntityMappings[source] = target;
            
            if (this.isPreviewActive) {
                this.testPreviewAdjusting = true;
                this.testAnonymization(this.testPreviewFile, this.isFullTest);
            }
        },
        unmergeEntity(source) {
            if (!source) return;
            delete this.courtEntityMappings[source];
            
            if (this.isPreviewActive) {
                this.testPreviewAdjusting = true;
                this.testAnonymization(this.testPreviewFile, this.isFullTest);
            }
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
            const parts = entity.name.split(/([\s,;-]+)/);
            
            const formattedParts = parts.map(part => {
                // Skip separators/whitespace for checking
                if (!part.trim() || /^[\s,;-]+$/.test(part)) return this.escapeHtml(part);
                
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
            if (this.hoverTooltip.isPinned) return;
            const target = e.target.closest('.anonymized-token');
            if (target) {
                // Clear any pending hide timeout
                if (this.hideTooltipTimeout) {
                    clearTimeout(this.hideTooltipTimeout);
                    this.hideTooltipTimeout = null;
                }

                if (target.dataset.originalHtml) {
                     this.hoverTooltip.text = decodeURIComponent(target.dataset.originalHtml);
                } else if (target.dataset.original) {
                    // Fallback to plain text if no HTML version
                    this.hoverTooltip.text = this.escapeHtml(target.dataset.original);
                }
                
                this.hoverTooltip.entityName = target.dataset.original || '';
                this.hoverTooltip.entityType = target.dataset.entityType || '';
                this.hoverTooltip.word = target.dataset.specificWord || '';

                if (this.hoverTooltip.text) {
                    this.hoverTooltip.visible = true;
                    this.hoverTooltip.x = e.clientX;
                    this.hoverTooltip.y = e.clientY;
                }
            }
        },
        handleTextMouseOut(e) {
            if (this.hoverTooltip.isPinned) return;
            const target = e.target.closest('.anonymized-token');
            if (target) {
                // Use a timeout to allow the user to move the mouse into the tooltip
                this.hideTooltipTimeout = setTimeout(() => {
                    if (!this.isHoveringTooltip && !this.hoverTooltip.isPinned) {
                        this.hoverTooltip.visible = false;
                    }
                }, 200);
            }
        },
        handleTooltipMouseEnter() {
            if (this.hoverTooltip.isPinned) return;
            this.isHoveringTooltip = true;
            if (this.hideTooltipTimeout) {
                clearTimeout(this.hideTooltipTimeout);
                this.hideTooltipTimeout = null;
            }
        },
        handleTooltipMouseLeave() {
            if (this.hoverTooltip.isPinned) return;
            this.isHoveringTooltip = false;
            this.hoverTooltip.visible = false;
        },
        handleTokenClick(e) {
            const target = e.target.closest('.anonymized-token');
            if (target) {
                // If clicking same token while pinned, just unpin (or do nothing? user said "fixed until clicked elsewhere")
                // Let's stick to user's "fixed until weggeklickt" logic
                
                // Pin the tooltip at current position
                this.hoverTooltip.isPinned = true;
                this.hoverTooltip.visible = true;
                
                // Content should already be right from hover, but let's be sure
                if (target.dataset.originalHtml) {
                     this.hoverTooltip.text = decodeURIComponent(target.dataset.originalHtml);
                } else if (target.dataset.original) {
                    this.hoverTooltip.text = this.escapeHtml(target.dataset.original);
                }
                this.hoverTooltip.entityName = target.dataset.original || '';
                this.hoverTooltip.entityType = target.dataset.entityType || '';
                this.hoverTooltip.word = target.dataset.specificWord || '';

                // Lock position to current mousepos (or center of element?)
                // clientX/Y is fine as it's where the user clicked
                this.hoverTooltip.x = e.clientX;
                this.hoverTooltip.y = e.clientY;

                // Scroll entity panel to highlight this entity
                if (this.showEntityPanel) {
                    this.$nextTick(() => this.scrollEntityPanelToEntity(this.hoverTooltip.entityName));
                }
            } else {
                // Unpin if clicking elsewhere in the preview
                this.unpinTooltip();
            }
        },
        unpinTooltip() {
            this.hoverTooltip.isPinned = false;
            this.hoverTooltip.visible = false;
        },

        // Scrolls the entity panel (side or footer) to show the row matching entityName, with a brief highlight
        scrollEntityPanelToEntity(entityName) {
            const containers = [this.$refs.entityPanelSideScroll, this.$refs.entityPanelFooterScroll];
            for (const container of containers) {
                if (!container) continue;
                const row = Array.from(container.querySelectorAll('tr[data-entity-name]'))
                    .find(tr => tr.dataset.entityName === entityName);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    // Flash: show highlight immediately, then fade out
                    row.style.transition = 'background-color 0s';
                    row.style.backgroundColor = 'rgba(99, 102, 241, 0.22)';
                    setTimeout(() => {
                        row.style.transition = 'background-color 1.1s ease-out';
                        row.style.backgroundColor = '';
                        setTimeout(() => { row.style.transition = ''; }, 1100);
                    }, 350);
                }
            }
        },

        // Cycles through all occurrences of entityName in the preview text and scrolls to next one
        scrollToNextTokenForEntity(entityName) {
            const container = this.$refs.singlePreviewContainer;
            if (!container) return;
            const tokens = Array.from(container.querySelectorAll('.anonymized-token'))
                .filter(el => el.dataset.original === entityName);
            if (tokens.length === 0) return;
            const currentIdx = this.entityScrollIndex[entityName] ?? -1;
            const nextIdx = (currentIdx + 1) % tokens.length;
            this.entityScrollIndex = { ...this.entityScrollIndex, [entityName]: nextIdx };
            const token = tokens[nextIdx];
            token.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Ring glow: show immediately, then fade out
            token.style.transition = 'box-shadow 0s';
            token.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.85), 0 0 10px rgba(99, 102, 241, 0.35)';
            setTimeout(() => {
                token.style.transition = 'box-shadow 0.8s ease-out';
                token.style.boxShadow = '0 0 0 0 rgba(99, 102, 241, 0)';
                setTimeout(() => {
                    token.style.boxShadow = '';
                    token.style.transition = '';
                }, 800);
            }, 550);
        },
        handleTextMouseMove(e) {
            if (this.hoverTooltip.visible && !this.hoverTooltip.isPinned) {
                this.hoverTooltip.x = e.clientX;
                this.hoverTooltip.y = e.clientY;
            }
        },
        handleTextSelection(event) {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText.length > 0) {
                // Determine if the click happened inside the preview box
                const previewBox = this.$el.querySelector('.cursor-text');
                if (previewBox && previewBox.contains(event.target)) {
                    this.selectionMenu.x = event.clientX;
                    this.selectionMenu.y = event.clientY;
                    this.selectionMenu.selectedText = selectedText;
                    this.selectionMenu.step = 1;
                    this.selectionMenu.selectedCategory = '';
                    this.selectionMenu.visible = true;
                }
            } else {
                this.selectionMenu.visible = false;
            }
        },
        addManualEntity() {
            const word = this.selectionMenu.selectedText;
            const category = this.selectionMenu.selectedCategory;
            if (!word || word.trim() === '' || !category) return;

            this.changeEntityCategory(word, category);

            this.selectionMenu.visible = false;
            
            // Clear selection
            window.getSelection().removeAllRanges();
        },
        changeEntityCategory(name, category) {
            if (!name || !category) return;

            const cleanWord = name.trim();
            if (!this.manualEntities.some(e => e.word === cleanWord)) {
                this.manualEntities.push({ word: cleanWord, category: category });
            } else {
                const existing = this.manualEntities.find(e => e.word === cleanWord);
                if (existing) existing.category = category;
            }

            // Remove from sessionRemovedEntities if it was ignored, so the category change takes effect
            this.sessionRemovedEntities = this.sessionRemovedEntities.filter(n => n.trim().toLowerCase() !== cleanWord.toLowerCase());

            // Re-run preview test
            if (this.isPreviewActive) {
                this.testPreviewAdjusting = true;
                this.testAnonymization(this.testPreviewFile, this.isFullTest);
            }
        },
        cancelManualEntityAdding() {
            this.selectionMenu.visible = false;
            this.selectionMenu.step = 1;
            this.selectionMenu.selectedCategory = '';
            window.getSelection().removeAllRanges();
        },
        removeManualEntity(name) {
            this.manualEntities = this.manualEntities.filter(n => n.word !== name);
            
            // Re-run preview test
            if (this.isPreviewActive) {
                this.testPreviewAdjusting = true;
                this.testAnonymization(this.testPreviewFile, this.isFullTest);
            }
        },
        hideSelectionMenu(event) {
            // Close if clicking outside the menu
            if (this.selectionMenu.visible && event) {
                const menuEl = this.$el.querySelector('.fixed.z-\\[110\\]');
                if (menuEl && menuEl.contains(event.target)) {
                    return;
                }
            }
            this.selectionMenu.visible = false;
        },

        // ── Single-file mode methods ──────────────────────────────────────────

        triggerSingleFileInput() {
            this.$refs.singleFileInput.click();
        },

        handleSingleFileInputChange(event) {
            const files = Array.from(event.target.files);
            if (files.length > 0) {
                this.setSingleFile(files[0]);
            }
            event.target.value = '';
        },

        handleSingleFileDrop(event) {
            this.singleFileDragOver = false;
            const files = event.dataTransfer?.files;
            if (files && files.length > 0) {
                this.setSingleFile(files[0]);
            }
        },

        setSingleFile(file) {
            const validation = validateFile(file);
            if (!validation.valid) {
                console.warn(`Ungültige Datei: ${validation.error}`);
                return;
            }
            // Reset preview state for the new file
            this.testPreviewResult = null;
            this.testPreviewError = null;
            this.testPreviewDetectedEntities = null;
            this.testPreviewCachedParams = { file: null, threshold: 0, labels: [] };
            this.manualEntities = [];
            this.sessionRemovedEntities = [];
            this.courtEntityMappings = {};
            this.hoverTooltip.isPinned = false;
            this.selectionMenu.visible = false;
            this.testPreviewFile = file;
        },

        runSingleAnonymization() {
            if (!this.testPreviewFile) return;
            this.testAnonymization(this.testPreviewFile, true);
        },

        downloadSingleResult(format) {
            if (!this.testPreviewResult || !this.testPreviewResult.anonymizedText) return;

            const originalName = this.testPreviewFile?.name || 'text';
            const baseName = getFileNameWithoutExtension(originalName);

            let ext;
            if (format === 'md') {
                ext = '.md';
            } else if (format === 'txt') {
                ext = '.txt';
            } else {
                // Auto: use convertWordToMarkdown for docx files
                ext = (this.isDocxFile && this.convertWordToMarkdown) ? '.md' : '.txt';
            }

            let fileName = `${baseName}_anonymized${ext}`;
            if (this.anonymizeFilenames) {
                const randomNum = Math.floor(10000000 + Math.random() * 90000000);
                fileName = `anon-text-${randomNum}${ext}`;
            }

            const blob = new Blob([this.testPreviewResult.anonymizedText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
};
</script>
