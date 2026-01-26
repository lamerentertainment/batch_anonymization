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
                            <div class="flex items-center gap-2 p-2 bg-base-200 rounded text-sm">
                                <DocumentIcon class="w-4 h-4 flex-shrink-0 text-base-content/60" />
                                <span class="flex-1 truncate" :title="file.relativePath || file.name">
                                    {{ file.relativePath || file.name }}
                                </span>
                                <button
                                    @click="removeInputFile(index)"
                                    class="btn btn-ghost btn-xs btn-square text-error"
                                >
                                    <XMarkIcon class="w-4 h-4" />
                                </button>
                            </div>
                            <!-- Test Button Overlay on Hover -->
                            <div
                                v-if="hoveredFileIndex === index && modelStatus === 'ready'"
                                class="absolute inset-0 flex items-center justify-center bg-base-200/90 rounded"
                            >
                                <button
                                    @click.stop="testAnonymization(file)"
                                    class="btn btn-xs btn-primary"
                                    :disabled="testPreviewLoading"
                                >
                                    <template v-if="testPreviewLoading && testPreviewFile === file">
                                        <span class="loading loading-spinner loading-xs mr-1"></span>
                                        Teste...
                                    </template>
                                    <template v-else>
                                        Anonymisierung testen
                                    </template>
                                </button>
                            </div>
                        </li>
                    </ul>
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
                        <TagIcon class="w-5 h-5" />
                         Anonymisierungseinstellungen
                    </h2>
                </div>

                <!-- Quick Select Buttons -->
                <div class="p-4 border-b border-base-300 flex gap-2 flex-wrap">
                    <button @click="selectAllLabels" class="btn btn-xs btn-outline">Alle</button>
                    <button @click="selectCommonLabels" class="btn btn-xs btn-outline">Häufige</button>
                    <button @click="deselectAllLabels" class="btn btn-xs btn-outline">Keine</button>
                </div>

                <!-- Entity Checkboxes -->
                <div class="flex-1 overflow-y-auto p-4">
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

                <!-- Anonymization Options -->
                <div class="p-4 border-t border-base-300 space-y-3">
                    <div class="form-control">
                        <label class="label cursor-pointer justify-start gap-2">
                            <input
                                type="checkbox"
                                v-model="anonymizePartialWords"
                                class="checkbox checkbox-sm checkbox-primary"
                            >
                            <span class="label-text text-sm">Einzelne Wörter anonymisieren</span>
                        </label>
                        <p class="text-xs text-base-content/50 ml-6">
                            Wenn deaktiviert, werden nur vollständige Entitäten ersetzt
                        </p>
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text text-sm">Minimale Zeichenlänge</span>
                        </label>
                        <input
                            type="number"
                            v-model.number="minCharacterThreshold"
                            min="0"
                            max="50"
                            class="input input-sm input-bordered w-full"
                            placeholder="0 = keine Beschränkung"
                        >
                        <p class="text-xs text-base-content/50 mt-1">
                            Entitäten mit weniger Zeichen werden nicht anonymisiert
                        </p>
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text text-sm">Negativliste (Ausnahmen)</span>
                        </label>
                        <textarea
                            v-model="exclusionList"
                            @input="saveExclusionList"
                            class="textarea textarea-sm textarea-bordered w-full h-20 text-xs"
                            placeholder="Wörter durch Komma trennen, z.B.: Berlin, Deutschland, Max"
                        ></textarea>
                        <p class="text-xs text-base-content/50 mt-1">
                            Diese Wörter werden nie anonymisiert
                        </p>
                    </div>
                </div>

                <!-- Threshold Control -->
                <div class="px-4 pb-2">
                     <label class="label pb-1 cursor-pointer">
                        <span class="label-text text-xs">Erkennungsschwelle (Threshold)</span>
                        <span class="label-text-alt font-mono">{{ threshold }}</span>
                    </label>
                    <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        v-model.number="threshold"
                        class="range range-xs range-primary"
                    />
                    <div class="w-full flex justify-between text-[10px] px-1 text-base-content/50">
                        <span>mehr</span>
                        <span>weniger</span>
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
                    <button @click="closeTestModal" class="btn btn-ghost btn-sm btn-square">
                        <XMarkIcon class="w-5 h-5" />
                    </button>
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
                            <span>
                                <strong class="text-primary">{{ testPreviewResult.entities.length }}</strong> Entitäten gefunden
                            </span>
                            <span class="text-base-content/40">|</span>
                            <span>Threshold: <strong>{{ threshold }}</strong></span>
                            <span class="text-base-content/40">|</span>
                            <span>Min. Zeichen: <strong>{{ minCharacterThreshold }}</strong></span>
                            <span class="text-base-content/40">|</span>
                            <span>Labels: <strong>{{ selectedLabels.length }}</strong></span>
                            <span v-if="testPreviewResult.exclusionListCount > 0" class="text-base-content/40">|</span>
                            <span v-if="testPreviewResult.exclusionListCount > 0" :title="'Negativliste: ' + exclusionList">
                                Negativliste: <strong class="text-warning">{{ testPreviewResult.exclusionListCount }}</strong> Wörter
                                <span v-if="testPreviewResult.excludedEntitiesCount > 0" class="text-success">
                                    ({{ testPreviewResult.excludedEntitiesCount }} übersprungen)
                                </span>
                            </span>
                        </div>

                        <!-- Anonymized Text with Highlighting -->
                        <div
                            class="p-4 border border-base-300 rounded-lg bg-base-200/50
                                   whitespace-pre-wrap font-mono text-sm leading-relaxed max-h-96 overflow-y-auto"
                            v-html="highlightedAnonymizedText"
                        ></div>

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
                                    :disabled="item.isInExclusionList"
                                    class="px-2 py-1 text-xs rounded-full border transition-all"
                                    :class="item.isInExclusionList
                                        ? 'bg-base-300 text-base-content/40 border-base-300 cursor-not-allowed line-through'
                                        : 'bg-base-100 text-base-content border-base-300 hover:bg-primary hover:text-primary-content hover:border-primary cursor-pointer'"
                                    :title="item.isInExclusionList
                                        ? 'Bereits in der Negativliste'
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
    ClockIcon
} from '@heroicons/vue/24/outline';

import JSZip from 'jszip';
import { processFile, validateFile, getFileNameWithoutExtension, SUPPORTED_EXTENSIONS } from '../utils/fileProcessor.js';
import anonymizerService, { AVAILABLE_LABELS, DEFAULT_SELECTED_LABELS } from '../utils/anonymizer.js';

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
        ClockIcon
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
            threshold: 0.1,
            exclusionList: '',

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
            hoveredFileIndex: null,

            // Anonymization options
            anonymizePartialWords: true,
            minCharacterThreshold: 0,
            threshold: 0.3
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
        highlightedAnonymizedText() {
            if (!this.testPreviewResult) return '';

            // Create a map of entity ID to original name
            const entityMap = {};
            this.testPreviewResult.entities.forEach(entity => {
                entityMap[entity.id] = entity.name;
            });

            let text = this.escapeHtml(this.testPreviewResult.anonymizedText);

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

            // Regex for placeholders: [id_type] or [id_type_letter]
            const placeholderRegex = /\[(\d+)_([a-z_\s]+?)(?:_[a-z])?\]/gi;

            text = text.replace(placeholderRegex, (match, id, type) => {
                const normalizedType = type.toLowerCase().trim();
                const style = colorMap[normalizedType] || 'background-color: #fed7aa; color: #7c2d12;';
                const originalValue = entityMap[id] || 'Unbekannt';
                // Escape quotes for the title attribute
                const escapedOriginal = originalValue.replace(/"/g, '&quot;');
                return `<span style="${style} padding: 1px 4px; border-radius: 3px; font-weight: 600; cursor: help;" title="Original: ${escapedOriginal}">${match}</span>`;
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
        // Exclusion list methods
        saveExclusionList() {
            try {
                localStorage.setItem('anonymizer_exclusion_list', this.exclusionList);
            } catch (error) {
                console.error('Failed to save exclusion list to localStorage:', error);
            }
        },
        loadExclusionList() {
            try {
                const saved = localStorage.getItem('anonymizer_exclusion_list');
                if (saved) {
                    this.exclusionList = saved;
                }
            } catch (error) {
                console.error('Failed to load exclusion list from localStorage:', error);
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
        addToExclusionList(word) {
            if (!word || word.trim() === '') return;

            const cleanWord = word.trim();
            const currentExclusions = this.parseExclusionList();

            // Check if word already exists (case-insensitive)
            const alreadyExists = currentExclusions.some(
                w => w.toLowerCase() === cleanWord.toLowerCase()
            );

            if (alreadyExists) return;

            // Add word to exclusion list
            if (this.exclusionList.trim() === '') {
                this.exclusionList = cleanWord;
            } else {
                this.exclusionList = this.exclusionList.trim() + ', ' + cleanWord;
            }

            // Save to localStorage
            this.saveExclusionList();
        },

        // Initialize model
        async initializeModel() {
            if (this.modelStatus === 'ready' || this.modelStatus === 'loading') {
                return;
            }

            try {
                this.modelStatus = 'loading';
                this.modelProgress = 0;
                await anonymizerService.initialize((progress) => {
                    this.modelProgress = progress;
                });
                this.modelStatus = 'ready';
                console.log('Model preloaded successfully');
            } catch (error) {
                this.modelStatus = 'error';
                this.modelError = error.message;
                console.error('Failed to preload model:', error);
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
                // Preserve folder structure in output name
                const outputName = baseName + '.txt';
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
                    const result = await processFile(outputFile.inputFile);
                    if (!result.success) {
                        throw new Error(result.error);
                    }

                    // Detect entities
                    const entities = await anonymizerService.detectEntities(
                        result.text,
                        this.selectedLabels,
                        this.threshold
                    );

                    // Anonymize text
                    const anonymizedText = anonymizerService.anonymizeText(result.text, entities, {
                        anonymizePartialWords: this.anonymizePartialWords,
                        minCharacterThreshold: this.minCharacterThreshold,
                        exclusionList: this.parseExclusionList()
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
        async testAnonymization(file) {
            this.testPreviewFile = file;
            this.testPreviewLoading = true;
            this.testPreviewError = null;
            this.testPreviewResult = null;
            this.showTestModal = true;

            try {
                // Extract text from file
                const result = await processFile(file);
                if (!result.success) {
                    throw new Error(result.error);
                }

                const fullText = result.text;

                // Limit to first 1000 words
                const words = fullText.split(/\s+/);
                const limitedText = words.slice(0, 1000).join(' ');

                // Detect entities with current settings
                const entities = await anonymizerService.detectEntities(
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

                // Anonymize text with current options including exclusion list
                const anonymizedText = anonymizerService.anonymizeText(
                    limitedText,
                    entities,
                    {
                        anonymizePartialWords: this.anonymizePartialWords,
                        minCharacterThreshold: this.minCharacterThreshold,
                        exclusionList: exclusionList
                    }
                );

                // Store result
                this.testPreviewResult = {
                    originalText: limitedText,
                    anonymizedText: anonymizedText,
                    entities: entities,
                    wordCount: Math.min(words.length, 1000),
                    totalWords: words.length,
                    exclusionListCount: exclusionList.length,
                    excludedEntitiesCount: excludedEntities.length
                };

            } catch (error) {
                console.error('Test anonymization error:', error);
                this.testPreviewError = error.message;
            } finally {
                this.testPreviewLoading = false;
            }
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
        }
    }
};
</script>
