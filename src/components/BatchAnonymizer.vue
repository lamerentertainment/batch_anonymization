<template>
    <div class="flex flex-col h-screen bg-base-200">
        <!-- Header -->
        <header class="bg-base-100 border-b border-base-300 px-6 py-4">
            <h1 class="text-2xl font-bold text-base-content">
                Batch-Anonymisierung
            </h1>
            <p class="text-sm text-base-content/60 mt-1">
                Mehrere Dateien gleichzeitig anonymisieren
            </p>
        </header>

        <!-- Status Banner -->
        <div v-if="modelStatus !== 'ready'" class="bg-info text-info-content px-6 py-3">
            <div class="flex items-center gap-3">
                <span v-if="modelStatus === 'loading'" class="loading loading-spinner loading-sm"></span>
                <span v-else-if="modelStatus === 'error'" class="text-error text-xl">!</span>
                <div class="flex-1">
                    <template v-if="modelStatus === 'idle'">
                        <strong>Modell nicht geladen.</strong> Klicken Sie auf "Verarbeitung starten" um das Modell zu initialisieren.
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
            <section class="w-80 border-r border-base-300 bg-base-100 flex flex-col">
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
                            class="flex items-center gap-2 p-2 bg-base-200 rounded text-sm"
                        >
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

            <!-- CENTER: Entity Selection -->
            <section class="w-80 border-r border-base-300 bg-base-100 flex flex-col">
                <div class="p-4 border-b border-base-300">
                    <h2 class="font-semibold text-lg flex items-center gap-2">
                        <TagIcon class="w-5 h-5" />
                        Entitäten auswählen
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
            // Input files
            inputFiles: [],
            dragOver: false,

            // Entity selection
            availableLabels: AVAILABLE_LABELS,
            selectedLabels: [...DEFAULT_SELECTED_LABELS],

            // Model status
            modelStatus: 'idle', // 'idle', 'loading', 'ready', 'error'
            modelProgress: 0,
            modelError: null,

            // Processing state
            isProcessing: false,
            currentProcessingFile: '',
            processedCount: 0,

            // Output files
            outputFiles: []
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
        }
    },
    methods: {
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

            // Initialize model if needed
            if (this.modelStatus !== 'ready') {
                try {
                    this.modelStatus = 'loading';
                    await anonymizerService.initialize((progress) => {
                        this.modelProgress = progress;
                    });
                    this.modelStatus = 'ready';
                } catch (error) {
                    this.modelStatus = 'error';
                    this.modelError = error.message;
                    this.isProcessing = false;
                    return;
                }
            }

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
                        this.selectedLabels
                    );

                    // Anonymize text
                    const anonymizedText = anonymizerService.anonymizeText(result.text, entities);

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
        }
    }
};
</script>
