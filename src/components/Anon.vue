<template>
    <div class="flex flex-col h-[100vh]">
        <!-- Error Banner -->
        <div v-if="initError" class="bg-error border border-error text-error-content px-4 py-3 flex items-center justify-between" role="alert">
            <span>
                <strong class="font-bold">Fehler:</strong>
                {{ initError }}
            </span>
            <button @click="initError = null" class="ml-4 text-error-content hover:text-error font-bold text-xl leading-none">
                <XMarkIcon class="w-5 h-5" />
            </button>
        </div>

        <!-- Downloading Banner -->
        <div v-if="downloading" class="bg-info border border-info text-info-content px-4 py-3" role="alert">
            <div class="flex items-center mb-2">
                <ArrowPathIcon class="animate-spin -ml-1 mr-3 h-5 w-5 text-info-content" />
                <div class="flex-1">
                    <div class="flex justify-between items-center mb-1">
                        <span>
                            <strong class="font-bold">Modelle werden heruntergeladen...</strong>
                            {{ downloadStatus || 'Download wird initialisiert...' }}
                        </span>
                        <span class="text-sm font-medium">{{ Math.round(downloadProgress) }}%</span>
                    </div>
                    <div class="w-full bg-info/20 rounded-full h-2">
                        <div 
                            class="bg-info h-2 rounded-full transition-all duration-300" 
                            :style="{ width: downloadProgress + '%' }"
                        ></div>
                    </div>
                    <p class="text-sm mt-1">
                        Bitte warten Sie, während die Anonymisierungsmodelle heruntergeladen und initialisiert werden. Dies geschieht nur einmal.
                    </p>
                </div>
            </div>
        </div>

        <!-- File Processing Banner -->
        <div v-if="fileProcessing" class="bg-warning border border-warning text-warning-content px-4 py-3 flex items-center" role="alert">
            <div class="flex items-center">
                <ArrowPathIcon class="animate-spin -ml-1 mr-3 h-5 w-5 text-warning-content" />
                <span>
                    <strong class="font-bold">Datei wird verarbeitet...</strong>
                    Text wird aus Ihrem Dokument extrahiert.
                </span>
            </div>
        </div>
        <!-- Header with title -->
        <div class="p-4 border-b border-base-300">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
                <div class="flex flex-col">
                    <h1 class="font-bold text-3xl sm:text-4xl">
                        Lokale Anonymisierung & Pseudonymisierung
                    </h1>
                    <p class="mt-1 text-sm text-base-content/60">
                        Diese Anwendung basiert auf der grandiosen Vorarbeit von 
                        <a href="https://www.recht-intelligent.ch" class="link link-hover" target="_blank" rel="noopener noreferrer">recht.intelligent</a>
                        /
                        <a href="https://iusable.ai" class="link link-hover" target="_blank" rel="noopener noreferrer">iusable.ai</a>
                    </p>
                </div>
                <div class="flex flex-col items-start sm:items-end space-y-2 sm:space-y-2">
                    <div class="flex items-center gap-2">
                        <button
                            v-if="hasGeminiKey"
                            @click="openPromptLibrary"
                            class="btn btn-ghost btn-xs"
                            title="Prompt Library öffnen"
                        >
                            <ListBulletIcon class="h-5 w-5" />
                        </button>
                        <button
                            v-if="hasGeminiKey"
                            @click="openTextBlockLibrary"
                            class="btn btn-ghost btn-xs"
                            title="Textbaustein Library öffnen"
                        >
                            <span class="font-bold text-base">§</span>
                        </button>
                        <button
                            @click="openCaseManagement"
                            class="btn btn-ghost btn-xs"
                            title="Case Management öffnen"
                        >
                            <FolderIcon class="h-5 w-5" />
                        </button>
                        <button
                            @click="openSettings"
                            class="btn btn-ghost btn-xs"
                            title="Einstellungen konfigurieren"
                        >
                            <Cog6ToothIcon class="h-5 w-5" />
                        </button>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button 
                            @click="selectModel('quantized')" 
                            :class="['btn btn-sm', selectedModel === 'quantized' ? 'btn-primary' : 'btn-outline']"
                            :disabled="downloading || loading || fileProcessing"
                        >
                            Schnell (580MB)
                        </button>
                        <!-- <button 
                            @click="selectModel('full')" 
                            :class="['btn btn-sm', selectedModel === 'full' ? 'btn-primary' : 'btn-outline']"
                            :disabled="downloading || loading || fileProcessing"
                        >
                            Beste (1.16GB)
                        </button> -->
                    </div>
                </div>
            </div>
        </div>

        <div class="flex flex-1 overflow-hidden border">
            <!-- Entities Side Panel -->
            <div class="w-80 border-r border-base-300 bg-base-200 flex flex-col">
                <!-- Mode Toggle and Entity Detection -->
                <div class="p-4 border-b border-base-300 bg-base-100 space-y-3">
                    <div class="flex gap-2">
                        <button 
                            @click="switchToAnonymize" 
                            :class="['btn', 'flex-1', mode === 'anonymize' ? 'btn-primary' : 'btn-outline']"
                        >
                            Anonymisieren
                        </button>
                        <button 
                            @click="switchToPseudonymize" 
                            :class="['btn', 'flex-1', mode === 'pseudonymize' ? 'btn-secondary' : 'btn-outline']"
                        >
                            De-Anonymisieren
                        </button>
                    </div>
                    <button 
                        v-if="mode === 'anonymize'" 
                        @click="getEntities" 
                        :disabled="downloading || loading || fileProcessing"
                        class="btn w-full"
                        :class="[ isUpdateState ? 'btn-warning' : 'btn-success', { 'btn-disabled': downloading || loading || fileProcessing } ]"
                    >
                        {{
                            downloading
                                ? 'Modelle werden heruntergeladen...'
                                : fileProcessing
                                    ? 'Datei wird verarbeitet...'
                                    : loading
                                        ? 'Entitäten werden erkannt...'
                                        : isUpdateState
                                            ? 'Anonymisierung aktualisieren'
                                            : 'Anonymisierung starten'
                        }}
                    </button>
                </div>

                <!-- Active Case Display OR Save/Load Presets -->
                <div v-if="activeCase" class="p-3 border-b border-base-300 bg-base-100 space-y-2">

                    <!-- Compact Case Info + Actions -->
                    <div class="flex items-center gap-2">
                        <!-- Clickable Case Name with Badge -->
                        <div
                            @click="openCaseManagement"
                            class="flex-1 bg-base-200 px-2 py-1 rounded cursor-pointer hover:bg-base-300 transition-colors"
                            title="Klicken um Fall zu wechseln"
                        >
                          <div class="flex items-center gap-2">
                            <div class="font-medium text-sm truncate">{{ activeCase.name }}</div>
                            <div class="badge badge-xs badge-ghost">
                              {{ activeCase.entities?.length || 0 }}
                            </div>
                          </div>
                        </div>

                        <!-- Icon-Only Action Buttons -->
                        <div class="flex gap-1 shrink-0">
                            <button
                                @click="loadEntitiesFromCase"
                                class="btn btn-xs btn-ghost btn-square"
                                :disabled="!activeCase.entities || activeCase.entities.length === 0"
                                title="Vom Fall laden"
                            >
                                <ArrowDownIcon class="h-4 w-4" />
                            </button>
                            <button
                                @click="saveEntitiesToCase"
                                class="btn btn-xs btn-ghost btn-square"
                                :disabled="entities.length === 0"
                                title="Im Fall speichern"
                            >
                                <ArrowUpIcon class="h-4 w-4" />
                            </button>
                            <button
                                @click="toggleAutoSync"
                                :class="[
                                    'btn btn-xs btn-square',
                                    autoSyncCase ? 'btn-primary' : 'btn-ghost'
                                ]"
                                :title="autoSyncCase
                                    ? 'Auto-Sync aktiv'
                                    : 'Auto-Sync inaktiv'"
                            >
                                <ArrowPathIcon
                                    :class="[
                                        'h-4 w-4',
                                        autoSyncCase ? 'animate-pulse' : ''
                                    ]"
                                />
                            </button>
                            <button
                                @click="closeActiveCase"
                                class="btn btn-xs btn-ghost btn-square text-error"
                                title="Fall schließen"
                            >
                                <XMarkIcon class="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Presets: Save/Load Entity Lists (only when no active case) -->
                <div v-else class="p-4 border-b border-base-300 bg-base-100 space-y-2">
                    <div class="flex items-center justify-between">
                        <p class="font-semibold">speichern/laden</p>
                        <button
                            class="btn btn-ghost btn-xs"
                            @click="togglePresetMenu"
                            :aria-expanded="showPresetMenu.toString()"
                            :aria-controls="'entity-presets-panel'"
                        >
                            {{ showPresetMenu ? 'Menü verbergen' : 'Menü anzeigen' }}
                        </button>
                    </div>

                    <div v-if="showPresetMenu" id="entity-presets-panel" class="space-y-2">
                        <div class="flex gap-2">
                            <input v-model="presetName" class="input input-bordered input-xs flex-1" placeholder="Name der Liste">
                            <button @click="saveEntitiesPreset" class="btn btn-xs btn-outline">Liste speichern</button>
                        </div>
                        <div class="flex gap-2 items-center">
                            <select v-model="selectedPreset" class="select select-xs select-bordered flex-1">
                                <option v-for="p in presets" :key="p.name" :value="p.name">
                                    {{ p.name }} ({{ p.count }})
                                </option>
                            </select>
                            <button @click="loadSelectedPreset" class="btn btn-xs btn-outline" :disabled="!selectedPreset">Liste laden</button>
                            <button @click="deleteSelectedPreset" class="btn btn-xs btn-ghost text-error" :disabled="!selectedPreset">Löschen</button>
                        </div>
                    </div>
                </div>

                <!-- Add Entity Form -->
                <div class="p-4 border-b border-base-300 bg-base-100 space-y-3">
                    <div class="flex justify-between items-center">
                        <p class="font-semibold">{{ mode === 'anonymize' ? 'Neue Entität hinzufügen' : 'Platzhalter automatisch erkennen' }}</p>
                        <button @click="clearEntities" class="btn btn-ghost btn-xs text-error">Alle löschen</button>
                    </div>
                    <template v-if="mode === 'anonymize'">
                        <input v-model="newEntityName" class="input input-bordered input-xs w-full" placeholder="Entitätstext">
                        <select v-model="newEntityType" class="select select-xs select-bordered w-full">
                            <option v-for="label in availableLabels" :key="label" :value="label">
                                {{ label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() }}
                            </option>
                        </select>
                        <button @click="addEntity" class="btn btn-xs btn-outline w-full">Entität hinzufügen</button>
                    </template>
                </div>

                <!-- Entities List -->
                <div ref="entityList" class="flex-1 overflow-y-auto p-4 space-y-3">
                    <template v-if="!loading && entities.length === 0">
                        <div class="text-base-content/50 text-center py-4">
                            {{ mode === 'anonymize' ? 'Noch keine Entitäten erkannt' : 'Keine Platzhalter gefunden' }}
                        </div>
                    </template>
                    <template v-else>
                        <div v-for="entity in entities" :key="entity.id" :id="'entity-' + entity.id"
                             class="bg-base-100 rounded shadow-sm p-3 space-y-2 transition-colors cursor-pointer"
                             :class="{ 'ring ring-primary': highlightedEntityId === entity.id }"
                             @click="onEntityClick(entity)">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-2">
                                    <span class="badge badge-outline">{{ entity.id }}_{{ entity.type }}</span>
                                    <span v-if="entity.source === 'regex'" class="badge badge-xs bg-warning text-warning-content h-5 w-5"  title="Durch benutzerdefinierte Regex erkannt">
                                        <SigmaIcon class="w-4 h-4" />
                                    </span>
                                    <span v-else-if="entity.source === 'ai'" class="badge badge-xs bg-info text-info-content h-5 w-5" title="Durch KI-Modell erkannt">
                                        <StarIcon class="w-4 h-4" />
                                    </span>
                                </div>
                                <button @click.stop="removeEntity(entity.id)" class="btn btn-ghost btn-xs text-error">
                                    <XMarkIcon class="w-4 h-4" />
                                </button>
                            </div>
                            <input 
                                v-model="entity.name" 
                                class="input input-bordered input-sm w-full"
                                :placeholder="mode === 'anonymize' ? 'Originaltext...' : 'Ersetzungswert...'"
                            >
                            <div v-if="mode === 'pseudonymize'" class="text-xs text-base-content/50">
                                Ersetzt [{{ entity.id }}_{{ entity.type }}] → {{ entity.name || 'Originalwert' }}
                            </div>
                        </div>
                    </template>
                </div>
                <div class="p-4 border-t border-base-300 bg-base-100 space-y-3">
                     <template v-if="mode !== 'anonymize'">
                        <button @click="detectPlaceholders" class="btn btn-outline w-full">
                            Löschen & Platzhalter aus Text erkennen
                        </button>
                    </template>
                </div>
            </div>

            <!-- Text Areas -->
            <div class="flex-1 flex flex-col">
                <!-- Headers -->
                <div class="flex border-b">
                    <div class="w-1/2 p-4 text-right">
                        <div class="flex justify-between items-center mb-2">
                            <h2 class="text-lg font-semibold text-base-content">Eingabetext <small>({{ text?.length }})</small></h2>
                            <button 
                                @click="triggerFileInput"
                                :disabled="fileProcessing"
                                class="btn btn-sm btn-outline"
                                :class="{ 'btn-disabled': fileProcessing }"
                            >                                
                                    {{ fileProcessing ? 'Verarbeitung läuft...' : 'Datei importieren' }}
                            </button>
                            <input 
                                type="file" 
                                ref="fileInput"
                                @change="handleFileUpload"
                                accept=".txt,.pdf,.docx"
                                :disabled="fileProcessing"
                                class="hidden"
                            >
                        </div>
                        <!-- File validation error -->
                        <div v-if="fileError" class="mb-2 text-sm text-error bg-error border border-error rounded p-2">
                            {{ fileError }}
                        </div>
                        <div class="flex gap-2 justify-end">
                            <button
                                @click="pasteFromClipboard"
                                class="btn btn-ghost btn-xs"
                                :disabled="!canPasteInput"
                                :title="canPasteInput ? 'Text aus Zwischenablage einfügen' : 'Pasting disabled in Restricted Mode'"
                            >
                                {{ canPasteInput ? 'Zwischenablage einfügen' : '🔒 Zwischenablage einfügen' }}
                            </button>
                            <button @click="clearMarkdown" class="btn btn-ghost btn-xs text-error">Markdown
                              löschen</button>
                            <button @click="clearText" class="btn btn-ghost btn-xs text-error">Text löschen</button>
                        </div>
                    </div>
                    <div class="w-1/2 p-4 border-l border-base-300 flex justify-between items-center">
                        <div>
                            <h2 class="text-lg font-semibold text-base-content">
                                {{ mode === 'anonymize' ? 'Anonymisierter Text' : 'Wiederhergestellter Text' }}
                            </h2>
                        </div>
                        <div class="flex gap-2">
                            <button
                                @click="copy"
                                class="btn btn-success btn-sm"
                                :disabled="!canCopyOutput"
                                :title="getCopyButtonTitle()"
                            >
                                <span v-if="scrollReview.enabled && !scrollReview.isFullyReviewed && isTextAnonymized">
                                    🔒 Text kopieren ({{ scrollReview.progress }}%)
                                </span>
                                <span v-else-if="!canCopyOutput">
                                    🔒 Text kopieren
                                </span>
                                <span v-else>
                                    ✓ Text kopieren
                                </span>
                            </button>

                            <!-- Save as Document Button -->
                            <button
                                v-if="activeCase && mode === 'anonymize'"
                                @click="saveOutputAsDocument"
                                class="btn btn-ghost btn-sm btn-square"
                                :disabled="!anonymizedTextPlain || anonymizedTextPlain.trim().length === 0"
                                title="Anonymisierten Text als Dokument im Fall speichern"
                            >
                                <DocumentPlusIcon class="h-5 w-5" />
                            </button>
                        </div>

                        <!-- Quick Infer Combo Button -->
                        <div v-if="hasGeminiKey && mode === 'anonymize'" class="dropdown dropdown-end">
                            <div class="join">
                                <!-- Main Quick Infer Button -->
                                <button
                                    @click="quickInfer"
                                    class="btn btn-warning btn-sm join-item"
                                    :disabled="!canQuickInfer"
                                    :title="getQuickInferButtonTitle()"
                                >
                                    <span v-if="scrollReview.enabled && !scrollReview.isFullyReviewed && isTextAnonymized">
                                        🔒 Quick Infer ({{ scrollReview.progress }}%)
                                    </span>
                                    <span v-else-if="!canQuickInfer">
                                        🔒 Quick Infer
                                    </span>
                                    <span v-else>
                                        🚀 {{ currentQuickInferPrompt ? currentQuickInferPrompt.title.substring(0, 15) + (currentQuickInferPrompt.title.length > 15 ? '...' : '') : 'Quick Infer' }}
                                    </span>
                                </button>
                                <!-- Dropdown Button -->
                                <button
                                    tabindex="0"
                                    @click="toggleQuickInferDropdown"
                                    class="btn btn-warning btn-sm join-item"
                                    :disabled="!canQuickInfer"
                                    title="Select prompt"
                                >
                                    ▼
                                </button>
                            </div>
                            <!-- Dropdown Menu -->
                            <ul
                                v-if="showQuickInferDropdown"
                                tabindex="0"
                                class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-64 mt-1 max-h-96 overflow-y-auto z-50"
                            >
                                <li v-if="availablePrompts.length === 0">
                                    <a class="text-sm opacity-60 cursor-default">No prompts available</a>
                                </li>
                                <li v-for="prompt in availablePrompts" :key="prompt.id">
                                    <a
                                        @click="selectPrompt(prompt.id)"
                                        class="text-sm"
                                        :class="{ 'active': selectedPromptId === prompt.id }"
                                    >
                                        <span class="flex-1 truncate">{{ prompt.title }}</span>
                                        <span v-if="selectedPromptId === prompt.id" class="badge badge-xs badge-primary">Selected</span>
                                        <span v-if="prompt.favorite" class="text-warning">★</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Scroll Review Progress Bar (Restricted Mode) -->
                <div v-if="scrollReview.enabled && !scrollReview.isFullyReviewed && isTextAnonymized"
                     class="px-4 py-2 bg-warning/10 border-t border-b border-warning/30">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-medium text-warning-content">Review Progress:</span>
                        <div class="flex-1 bg-base-300 rounded-full h-2 overflow-hidden">
                            <div
                                class="bg-success h-2 rounded-full transition-all duration-300"
                                :style="{width: scrollReview.progress + '%'}"
                            ></div>
                        </div>
                        <span class="text-xs font-bold text-warning-content">{{ scrollReview.progress }}%</span>
                    </div>
                    <p class="text-xs text-warning-content">
                        ⚠️ Bitte scrollen Sie durch den gesamten Text, um die Anonymisierung zu überprüfen
                    </p>
                </div>

                <!-- Scrollable Content Container -->
                <div class="flex-1 overflow-hidden">
                    <div class="flex h-full">
                        <!-- Input Area with Drag and Drop -->
                        <div
                            class="w-1/2 h-full relative"
                            @drop.prevent="handleFileDrop"
                            @dragover.prevent="handleDragOver"
                            @dragleave.prevent="handleDragLeave"
                        >
                            <!-- Highlight overlay for placeholders in textarea -->
                            <div
                                v-if="activeHighlightEntityId != null"
                                class="absolute inset-0 p-4 whitespace-pre-wrap pointer-events-none text-transparent"
                                v-html="inputOverlayHtml"
                            ></div>
                            <textarea
                                v-model="text"
                                @select="setTextareaSelection"
                                @click="onInputClick"
                                @paste="handlePaste"
                                ref="textArea"
                                :class="[
                                    'w-full h-full p-4 resize-none border-0 focus:ring-0',
                                    dragOver ? 'bg-info/20' : ''
                                ]"
                                placeholder="Geben Sie hier Ihren Text ein oder fügen Sie ihn ein, oder ziehen Sie eine Datei (TXT, PDF, DOCX) hierher..."
                            ></textarea>

                            <!-- Drag overlay -->
                            <div 
                                v-if="dragOver"
                                class="absolute inset-0 bg-info bg-opacity-90 border-2 border-dashed border-info flex items-center justify-center pointer-events-none"
                            >
                                <div class="text-center">
                                    <ArrowUpTrayIcon class="w-12 h-12 text-info-content mx-auto mb-2" />
                                    <p class="text-info-content font-medium">Legen Sie Ihre Datei hier ab</p>
                                    <p class="text-info-content/80 text-sm">TXT, PDF, DOCX werden unterstützt</p>
                                </div>
                            </div>
                        </div>

                        <!-- Output Area -->
                        <div
                            ref="outputContainer"
                            @mouseup="setTextSelection"
                            @click="onOutputClick"
                            class="w-1/2 h-full border-l border-base-300 bg-info/5 relative overflow-y-auto"
                        >
                            <!-- Zone Visualization Overlay (Restricted Mode) -->
                            <div v-if="scrollReview.enabled && isTextAnonymized" class="absolute inset-0 pointer-events-none">
                                <div
                                    v-for="(zone, index) in scrollReview.zones"
                                    :key="'zone-' + index"
                                    :style="{
                                        position: 'absolute',
                                        top: zone.start + 'px',
                                        left: 0,
                                        right: 0,
                                        height: (zone.end - zone.start) + 'px',
                                        backgroundColor: zone.seen ? 'rgba(34, 197, 94, 0.06)' : 'transparent',
                                        transition: 'background-color 0.5s ease',
                                        borderTop: index > 0 ? '1px dashed rgba(0,0,0,0.03)' : 'none'
                                    }"
                                ></div>
                            </div>

                            <!-- Actual Content -->
                            <div ref="textContainer" class="relative z-10 p-4">
                                <p v-html="anonymizedText" class="whitespace-pre-wrap"></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Settings Modal -->
        <div v-if="showSettings" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-base-100 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-base-content">Anonymisierungseinstellungen</h3>
                    <button @click="showSettings = false" class="btn btn-ghost btn-sm">
                        <XMarkIcon class="w-5 h-5" />
                    </button>
                </div>

                <div class="mb-4">
                    <p class="text-sm text-base-content/60 mb-3">
                        Wählen Sie aus, welche Arten von Entitäten erkannt und anonymisiert werden sollen. {{ selectedLabels.length }} von {{ availableLabels.length }} Labels ausgewählt.
                    </p>

                    <div class="flex gap-2 mb-3">
                        <button @click="selectAllLabels" class="btn btn-sm btn-outline">
                            Alle auswählen
                        </button>
                        <button @click="deselectAllLabels" class="btn btn-sm btn-outline">
                            Alle abwählen
                        </button>
                        <button @click="selectCommonLabels" class="btn btn-sm btn-primary">
                            Nur Häufige
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-base-300 rounded p-3">
                    <label v-for="label in availableLabels" :key="label" class="flex items-center space-x-2 hover:bg-base-200 p-1 rounded">
                        <input 
                            type="checkbox" 
                            :value="label" 
                            v-model="selectedLabels"
                            class="checkbox checkbox-sm"
                        >
                        <span class="text-sm capitalize">{{ formatLabel(label) }}</span>
                    </label>
                </div>
                
                <!-- Custom Regex Patterns Section -->
                <div class="mt-6 border-t pt-4">
                    <h4 class="text-md font-semibold text-base-content mb-3">Custom Regex Patterns</h4>
                    <p class="text-sm text-gray-600 mb-3">
                        Add custom regular expressions to detect specific patterns in your text.
                        <span class="text-warning">⚠️ Be careful with complex patterns to avoid performance issues.</span>
                    </p>
                    
                    <!-- Add New Regex Pattern -->
                    <div class="bg-base-200 rounded p-3 mb-3">
                        <div class="grid grid-cols-1 gap-2">
                            <div class="flex gap-2">
                                <input 
                                    v-model="newRegexPattern" 
                                    class="input input-bordered input-sm flex-1" 
                                    placeholder="Enter regex pattern (e.g., \\d{3}-\\d{2}-\\d{4})"
                                    @keyup.enter="addRegexPattern"
                                >
                                <input 
                                    v-model="newRegexLabel" 
                                    class="input input-bordered input-sm w-32" 
                                    placeholder="Label"
                                    @keyup.enter="addRegexPattern"
                                >
                            </div>
                            <div class="flex gap-2 items-center">
                                <label class="flex items-center space-x-1">
                                    <input type="checkbox" v-model="newRegexGlobal" class="checkbox checkbox-xs">
                                    <span class="text-xs">Global</span>
                                </label>
                                <label class="flex items-center space-x-1">
                                    <input type="checkbox" v-model="newRegexCaseInsensitive" class="checkbox checkbox-xs">
                                    <span class="text-xs">Case Insensitive</span>
                                </label>
                                <button @click="addRegexPattern" class="btn btn-sm btn-primary ml-auto">
                                    Add Pattern
                                </button>
                            </div>
                            <div v-if="regexError" class="text-xs text-error">
                                {{ regexError }}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Existing Regex Patterns -->
                    <div v-if="customRegexPatterns.length > 0" class="space-y-2">
                        <div v-for="(pattern, index) in customRegexPatterns" :key="index" 
                             class="flex items-center justify-between bg-base-100 border border-base-300 rounded p-2">
                            <div class="flex-1">
                                <code class="text-sm bg-base-200 px-1 rounded">{{ pattern.pattern }}</code>
                                <span class="ml-2 text-xs text-base-content/50">
                                    → {{ pattern.label }} 
                                    <span class="ml-1">
                                        ({{ pattern.flags || 'no flags' }})
                                    </span>
                                </span>
                            </div>
                            <button @click="removeRegexPattern(index)" class="btn btn-ghost btn-xs text-red-500">
                                ×
                            </button>
                        </div>
                    </div>
                    
                    <div v-else class="text-sm text-base-content/50 italic">
                        No custom patterns added yet.
                    </div>
                </div>
                
                <!-- Model Cache Management Section -->
                <div class="mt-6 border-t pt-4">
                    <h4 class="text-md font-semibold text-base-content mb-3">Model Cache Management</h4>
                    <p class="text-sm text-base-content/60 mb-3">
                        Models are cached locally in your browser to improve loading times. Cache is shared across sessions.
                    </p>
                    
                    <!-- Memory Usage Warning -->
                    <div class="bg-warning/10 border border-warning/30 rounded p-3 mb-3">
                        <div class="flex items-start space-x-2">
                            <ExclamationTriangleIcon class="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                            <div class="text-sm">
                                <p class="font-medium text-warning">Memory Requirements</p>
                                <p class="text-warning/80 mt-1">
                                    AI models require significant memory (500MB+). Close other browser tabs and applications if you encounter out-of-memory errors.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 rounded p-3 mb-3">
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <strong>Cache Status:</strong>
                                <span v-if="cacheStats" class="ml-1">
                                    {{ cacheStats.modelCount }} models
                                </span>
                                <span v-else class="ml-1 text-gray-500">Loading...</span>
                            </div>
                            <div>
                                <strong>Total Size:</strong>
                                <span v-if="cacheStats" class="ml-1">
                                    {{ formatCacheSize(cacheStats.totalSize) }}
                                </span>
                                <span v-else class="ml-1 text-gray-500">Loading...</span>
                            </div>
                        </div>
                        
                        <div v-if="cacheStats && cacheStats.models.length > 0" class="mt-3 space-y-1">
                            <div v-for="model in cacheStats.models" :key="model.url" class="text-xs bg-white rounded p-2 flex justify-between">
                                <div>
                                    <code class="text-blue-600">{{ model.modelType }}</code>
                                    <span class="ml-2 text-gray-500">{{ formatCacheSize(model.size) }}</span>
                                </div>
                                <div class="text-gray-400">
                                    {{ new Date(model.lastAccessed).toLocaleDateString() }}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-2">
                        <button @click="refreshCacheStats" class="btn btn-sm btn-outline" :disabled="refreshingCache">
                            {{ refreshingCache ? 'Refreshing...' : 'Refresh Stats' }}
                        </button>
                        <button @click="confirmClearCache" class="btn btn-sm btn-outline text-red-600" :disabled="clearingCache">
                            {{ clearingCache ? 'Clearing...' : 'Clear Cache' }}
                        </button>
                    </div>
                </div>
                
                <!-- Gemini API Key Section -->
                <div class="mt-6 border-t pt-4">
                    <h4 class="text-md font-semibold text-base-content mb-3">Gemini API Key</h4>
                    <p class="text-sm text-base-content/60 mb-3">
                        Provide your Google Gemini API key. It will be stored locally in your browser only and never sent anywhere until you use features that require it.
                    </p>
                    <div class="flex items-center gap-2">
                        <input 
                            :type="geminiKeyVisible ? 'text' : 'password'"
                            v-model="geminiApiKey"
                            class="input input-bordered w-full"
                            placeholder="Enter your Gemini API key (starts with AI... orAIza...)"
                        >
                        <button class="btn btn-outline" type="button" @click="geminiKeyVisible = !geminiKeyVisible">
                            {{ geminiKeyVisible ? 'Hide' : 'Show' }}
                        </button>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button class="btn btn-sm btn-primary" type="button" @click="saveGeminiKey">Save Key</button>
                        <button class="btn btn-sm btn-outline" type="button" @click="clearGeminiKey" :disabled="!geminiApiKey">Clear</button>
                    </div>
                    <div class="text-xs text-base-content/60 mt-2" v-if="geminiKeySavedAt">
                        Saved at: {{ new Date(geminiKeySavedAt).toLocaleString() }}
                    </div>
                </div>

                <!-- Notification Settings Section -->
                <div class="mt-6 border-t pt-4">
                    <h4 class="text-md font-semibold text-base-content mb-3">🔔 Benachrichtigungen</h4>
                    <p class="text-sm text-base-content/60 mb-3">
                        Erhalten Sie Browser-Benachrichtigungen, wenn lange laufende Aufgaben abgeschlossen sind, während Sie die Anwendung im Hintergrund haben.
                    </p>

                    <!-- Permission Status -->
                    <div class="alert mb-3" :class="notificationPermissionGranted ? 'alert-success' : 'alert-warning'">
                        <span>
                            {{ notificationPermissionGranted ? '✓ Berechtigung erteilt' : '⚠ Berechtigung erforderlich' }}
                        </span>
                    </div>

                    <!-- Request Permission Button -->
                    <div v-if="!notificationPermissionGranted" class="mb-4">
                        <button @click="requestNotificationPermission" class="btn btn-sm btn-primary">
                            Berechtigung anfordern
                        </button>
                        <p class="text-xs text-base-content/50 mt-2">
                            Klicken Sie auf "Berechtigung anfordern", um Browser-Benachrichtigungen zu aktivieren.
                        </p>
                    </div>

                    <!-- Test Notification Button (only when permission granted) -->
                    <div v-if="notificationPermissionGranted" class="mb-4 p-3 bg-base-200 rounded">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium">Test-Benachrichtigung</span>
                            <button @click="sendTestNotification" class="btn btn-xs btn-accent">
                                Test senden
                            </button>
                        </div>
                        <p class="text-xs text-base-content/50">
                            Sendet sofort eine Test-Benachrichtigung, um zu prüfen ob alles funktioniert.
                            <strong>Hinweis:</strong> Benachrichtigungen bei Tasks erscheinen nur wenn das Browser-Fenster minimiert oder im Hintergrund ist.
                        </p>
                        <div class="mt-2 text-xs">
                            <strong>Debug-Info:</strong>
                            <ul class="list-disc ml-4 mt-1 text-base-content/60">
                                <li>Permission: {{ notificationPermissionGranted ? '✓ Erteilt' : '✗ Nicht erteilt' }}</li>
                                <li>Benachrichtigungen: {{ notificationSettings.enabled ? '✓ Aktiviert' : '✗ Deaktiviert' }}</li>
                                <li>Fenster sichtbar: {{ !isDocumentHidden ? '✓ Ja (Notifications werden unterdrückt)' : '✗ Nein (Notifications werden angezeigt)' }}</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Notification Settings -->
                    <div class="space-y-2">
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-3">
                                <input
                                    type="checkbox"
                                    class="checkbox checkbox-sm"
                                    v-model="notificationSettings.enabled"
                                    @change="saveNotificationSettings"
                                >
                                <div>
                                    <span class="label-text font-medium">Benachrichtigungen aktivieren</span>
                                    <p class="text-xs text-base-content/50">Master-Schalter für alle Benachrichtigungen</p>
                                </div>
                            </label>
                        </div>

                        <div class="form-control ml-6" :class="{ 'opacity-50': !notificationSettings.enabled }">
                            <label class="label cursor-pointer justify-start gap-3">
                                <input
                                    type="checkbox"
                                    class="checkbox checkbox-sm"
                                    v-model="notificationSettings.entityDetection"
                                    :disabled="!notificationSettings.enabled"
                                    @change="saveNotificationSettings"
                                >
                                <div>
                                    <span class="label-text">Entitätserkennung abgeschlossen</span>
                                    <p class="text-xs text-base-content/50">Benachrichtigung wenn GLiNER-Analyse fertig ist</p>
                                </div>
                            </label>
                        </div>

                        <div class="form-control ml-6" :class="{ 'opacity-50': !notificationSettings.enabled }">
                            <label class="label cursor-pointer justify-start gap-3">
                                <input
                                    type="checkbox"
                                    class="checkbox checkbox-sm"
                                    v-model="notificationSettings.geminiInference"
                                    :disabled="!notificationSettings.enabled"
                                    @change="saveNotificationSettings"
                                >
                                <div>
                                    <span class="label-text">Gemini Inferenz abgeschlossen</span>
                                    <p class="text-xs text-base-content/50">Benachrichtigung wenn Gemini-Prompt fertig ist</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Security Settings Section -->
                <div class="mt-6 border-t pt-4">
                    <h4 class="text-md font-semibold text-base-content mb-3">🔒 Security Settings</h4>

                    <!-- Status Badge -->
                    <div class="alert mb-3" :class="isUnrestricted ? 'alert-success' : 'alert-warning'">
                        <span>
                            {{ isUnrestricted ? '🔓 Uneingeschränkter Modus aktiviert' :
                            '🔒 Eingeschränkter Modus aktiviert' }}
                        </span>
                    </div>

                    <!-- Restricted Mode Info -->
                    <div v-if="!isUnrestricted" class="text-sm text-base-content/60 mb-3">
                        <p class="font-medium mb-1">Restricted mode verhindert:</p>
                        <ul class="list-disc ml-5">
                            <li>Kopieren und LLM-Inferenz des anonymisierten Textes, solange dieser nicht überprüft
                              wurde</li>
                            <li>Einfügen von Text im De-Anonymisierungsmodus</li>
                        </ul>
                    </div>

                    <!-- Unlock/Lock Controls -->
                    <div v-if="!isUnrestricted" class="form-control">
                        <label class="label">
                            <span class="label-text">Enter Master Password to Unlock</span>
                        </label>
                        <div class="flex gap-2">
                            <input
                                v-model="unlockPassword"
                                type="password"
                                class="input input-bordered input-sm flex-1"
                                placeholder="Master Password"
                                @keyup.enter="unlockMode"
                            />
                            <button @click="unlockMode" class="btn btn-sm btn-success" :disabled="!unlockPassword">
                                Unlock
                            </button>
                        </div>
                    </div>

                    <div v-else class="flex gap-2">
                        <button @click="lockMode" class="btn btn-sm btn-warning w-full">
                            🔒 Lock Mode (Activate Restrictions)
                        </button>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-6">
                    <button @click="showSettings = false" class="btn btn-outline">
                        Cancel
                    </button>
                    <button @click="applySettings" class="btn btn-primary">
                        Apply Settings
                    </button>
                </div>
            </div>
        </div>
        <prompt-library-modal
            v-if="hasGeminiKey && showPromptLibrary"
            @close="showPromptLibrary = false"
            @insert="handlePromptInsert"
            @inferResult="handlePromptInferred"
        />
        <text-block-library-modal
            v-if="showTextBlockLibrary"
            @close="showTextBlockLibrary = false"
        />
        <case-management-modal
            v-if="showCaseManagementModal"
            :currentEntities="entities"
            :currentMode="mode"
            :activeCaseId="activeCase?.id"
            @close="showCaseManagementModal = false"
            @loadCase="onLoadCase"
            @loadDocument="onLoadDocument"
        />
        <!-- Enhanced Toast (same as PromptLibraryModal) -->
        <div v-if="toastVisible" class="toast toast-center fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div
                :class="[
                    'alert',
                    toastType === 'error' ? 'alert-error' : 'alert-info',
                    toastDetail ? 'cursor-pointer' : '',
                    toastLoading ? 'animate-pulse' : ''
                ]"
                :style="{
                    maxWidth: '90vw',
                    width: '600px',
                    maxHeight: '400px',
                    overflow: 'auto'
                }"
                @click="onToastClick"
                role="button"
                :title="toastDetail ? 'Click to view details' : ''"
            >
                <span class="flex items-start w-full">
                    <span v-if="toastLoading" class="loading loading-spinner loading-xs mr-2 mt-1 shrink-0" aria-hidden="true"></span>
                    <span class="whitespace-pre-wrap break-words font-mono text-sm flex-1">{{ toastMessage }}<template v-if="toastDetail"> (click to view details)</template></span>
                </span>
            </div>
        </div>
    </div>
</template>

<script>
import { Gliner } from 'gliner';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import modelCache from '../utils/modelCache.js';
import { savePreset as saveEntityPreset, loadPreset as loadEntityPreset, listPresets as listEntityPresets, deletePreset as deleteEntityPreset } from '../utils/entityPresets.js';
import PromptLibraryModal from './PromptLibraryModal.vue';
import TextBlockLibraryModal from './TextBlockLibraryModal.vue';
import CaseManagementModal from './CaseManagementModal.vue';
import securityManager from '../utils/securityManager.js';
import notificationService from '../utils/notificationService.js';
import promptCache from '../utils/promptCache.js';
import textBlockCache from '../utils/textBlockCache.js';
import geminiInferenceService from '../utils/geminiInferenceService.js';
import caseCache from '../utils/caseCache.js';
import documentCache from '../utils/documentCache.js';

// import * as pdfjsWorker from '../assets/pdf.worker.min.mjs';

// Heroicons imports
import {
    ArrowPathIcon,
    ArrowUpTrayIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    Cog6ToothIcon,
    ExclamationTriangleIcon,
    StarIcon,
    XMarkIcon,
    ListBulletIcon,
    FolderIcon,
    DocumentPlusIcon
} from '@heroicons/vue/24/outline';

// Custom SigmaIcon for Σ (not in heroicons, so define as a functional component)
const SigmaIcon = {
    name: 'SigmaIcon',
    functional: true,
    render(h) {
        return h('span', { class: 'font-bold', style: 'font-size:1rem;line-height:1' }, 'Σ');
    }
};

export default {
    name: 'Anon',
    props: {
        value: {
            type: String,
            required: true,
        },
    },
    data() {
        return { 
            loading: false,
            downloading: false,
            downloadProgress: 0,
            downloadStatus: '',
            text: this.value,
            savedInputText: '',
            newEntityName: '',
            newEntityType: 'person',
            entities: [],
            mode: 'anonymize', // 'anonymize' or 'pseudonymize'
            selectedModel: 'quantized', // 'quantized' or 'full'
            availableLabels: [
                "location",
                "street",
                "person",
                "date",
                "time",
                "car brand",
                "car model",
                "colour",
                "organization",
                "phone number",
                "address",
                "passport number",
                "email",
                "credit card number",
                "social security number",
                "health insurance id number",
                "date of birth",
                "mobile phone number",
                "bank account number",
                "medication",
                "driver's license number",
                "tax identification number",
                "medical condition",
                "identity card number",
                "national id number",
                "ip address",
                "email address",
                "iban",
                "credit card expiration date",
                "username",
                "health insurance number",
                "registration number",
                "student id number",
                "insurance number",
                "flight number",
                "landline phone number",
                "blood type",
                "reservation number",
                "digital signature",
                "social media handle",
                "license plate number",
                "postal code",
                "passport_number",
                "serial number",
                "vehicle registration number",
                "credit card brand",
                "fax number",
                "visa number",
                "insurance company",
                "identity document number",
                "transaction number",
                "national health insurance number",
                "birth certificate number",
                "train ticket number",
                "passport expiration date",
                "social_security_number"
            ],
            gliner: null, // Add this line
            glinerInstances: {}, // Cache for different model instances
            initError: null, // Error message for initialization
            fileProcessing: false, // File processing state
            dragOver: false, // Drag over state
            fileError: null, // File validation error
            showSettings: false, // Settings modal visibility
            selectedLabels: [ // Default selected labels (common ones)
                "person", "organization", "phone number",
                "email", "address", "credit card number", "social security number",
                "iban"
            ],
            // Toast for info messages (enhanced - same as PromptLibraryModal)
            toastMessage: null,
            toastVisible: false,
            toastDetail: '',
            toastType: 'info',
            toastLoading: false,
            _toastTimer: null,
            // Custom regex patterns
            customRegexPatterns: [],
            newRegexPattern: '',
            newRegexLabel: '',
            newRegexGlobal: true,
            newRegexCaseInsensitive: false,
            regexError: null,
            // Cache management
            cacheStats: null,
            refreshingCache: false,
            clearingCache: false,
            // Gemini API key settings
            geminiApiKey: '',
            geminiKeyVisible: false,
            geminiKeySavedAt: null,
            geminiKeySaveStatus: null,
            // UI: highlight entity in list when navigated
            highlightedEntityId: null,
            _highlightTimer: null,
            // Active entity to highlight placeholders in text areas
            activeHighlightEntityId: null,
            // Entity presets
            presetName: '',
            selectedPreset: '',
            presets: [],
            // UI state
            showPresetMenu: false,
            // Prompt Library modal
            showPromptLibrary: false,
            // Text Block Library modal
            showTextBlockLibrary: false,
            // Case Management modal
            showCaseManagementModal: false,
            // Active case
            activeCase: null,
            autoSyncCase: false, // Auto-sync entities to case after anonymization
            // Quick Infer feature
            availablePrompts: [],
            selectedPromptId: null,
            showQuickInferDropdown: false,
            // Text Block integration for Quick Infer
            textBlocks: [],
            selectedTextBlocks: {}, // Map of promptId -> textBlockId
            // Security / Restricted Mode
            isUnrestricted: false,
            unlockPassword: '',
            // Scroll Review (Restricted Mode feature)
            scrollReview: {
                enabled: false,           // Active only in Restricted Mode + Anonymize Mode
                zones: [],                // Array of {start, end, seen}
                zoneHeight: 100,          // 100px per zone
                totalZones: 0,
                seenZones: 0,
                isFullyReviewed: false,   // True when 100% scrolled
                progress: 0               // Percentage 0-100
            },
            // Synchronized scrolling
            _isSyncScrolling: false,      // Prevent infinite scroll loops
            // Notification settings
            notificationSettings: {
                enabled: true,
                entityDetection: true,
                geminiInference: true
            },
            notificationPermissionGranted: false
        }
    },
    mounted() {
        // Initialize Gliner on mount (preload model after DOM is ready)
        this.initGliner();

        // Set PDF.js worker with smart fallback: local file first (offline), then CDN
        // Try local worker first for complete offline functionality
        const localWorkerPath = '/pdf.worker.min.mjs';
        const cdnWorkerPath = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        // Check if local worker exists, otherwise fallback to CDN
        fetch(localWorkerPath, { method: 'HEAD' })
            .then(() => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
                console.log('✅ Using local PDF.js worker (offline mode)');
            })
            .catch(() => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerPath;
                console.log('⚠️ Local PDF.js worker not found, using CDN fallback (requires internet)');
            });

        // Load entity presets list
        this.refreshPresets();

        // Persist current anonymized output to localStorage so other components (e.g., PromptLibraryModal)
        // can access it without requiring the user to press "Text kopieren".
        try {
            this.persistCurrentOutput();
        } catch (_) {}

        // Load security state (restricted/unrestricted mode)
        this.isUnrestricted = securityManager.isUnrestricted();

        // Add keyboard event listeners for restricted mode
        this.setupKeyboardRestrictions();

        // Setup synchronized scrolling between input and output areas
        this.setupSyncScroll();

        // Initialize notification settings and permission status
        try {
            this.loadNotificationSettings();
        } catch (e) {
            console.warn('Failed to initialize notification settings:', e);
        }

        // Load available prompts and text blocks for Quick Infer feature
        this.loadPrompts();
        this.loadTextBlocks().then(() => {
            // Load cached text block selections after text blocks are loaded
            this.loadCachedTextBlockSelections();
        });

        // Load active case from localStorage if exists
        this.loadActiveCase();
    },
    computed: {
        hasGeminiKey() {
            try {
                const localKey = (localStorage.getItem('settings.geminiApiKey') || '').trim();
                const stateKey = (this.geminiApiKey || '').trim();
                return Boolean(stateKey || localKey);
            } catch (_) {
                return Boolean((this.geminiApiKey || '').trim());
            }
        },
        isDocumentHidden() {
            return document.hidden;
        },
        isUpdateState() {
            const hasText = (this.text || '').trim().length > 0;
            const hasEntities = Array.isArray(this.entities) && this.entities.length > 0;
            return this.mode === 'anonymize' && hasText && hasEntities;
        },
        inputOverlayHtml() {
            // Mirror the textarea content and highlight placeholders for the active entity
            const escapeHtml = (s) => (s || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            let content = escapeHtml(this.text || '');

            if (this.activeHighlightEntityId != null) {
                const id = this.activeHighlightEntityId;
                // Highlight [id_type] and [id_type_suffix]
                const re = new RegExp(`\\\[${id}_[^\\]]+\\\]`, 'g');
                content = content.replace(re, (m) => `<mark class="bg-warning/40 rounded px-0.5 text-base-content">${m}</mark>`);
            }
            // Preserve newlines (whitespace-pre-wrap handles spaces and tabs well)
            content = content.replace(/\n/g, '<br>');
            return content;
        },
        anonymizedTextPlain() {
            if (this.mode === 'pseudonymize') {
                return this.pseudonymizedText();
            }
            let t = this.text;
            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const letters = 'abcdefghijklmnopqrstuvwxyz';

            this.entities.forEach(entity => {
                if (!entity.name) return;
                const words = entity.name.split(/\s+|-/).filter(w => w && w.trim().length > 0);

                if (words.length > 1) {
                    const fullJoined = words.map(w => escapeRegex(w)).join('[\\s-]+');
                    const fullPattern = new RegExp(`\\b${fullJoined}\\b`, 'gi');
                    const sequence = words
                        .map((_, idx) => `[${entity.id}_${entity.type}_${letters[idx] || String(idx + 1)}]`)
                        .join(' ');
                    t = t.replace(fullPattern, sequence);
                } else if (words.length === 1) {
                    const singleWordPattern = new RegExp(`\\b${escapeRegex(words[0])}\\b`, 'gi');
                    t = t.replace(singleWordPattern, `[${entity.id}_${entity.type}]`);
                }

                words.forEach((w, idx) => {
                    const suffix = letters[idx] || String(idx + 1);
                    const wordPattern = new RegExp(`\\b${escapeRegex(w)}\\b`, 'gi');
                    t = t.replace(wordPattern, `[${entity.id}_${entity.type}_${suffix}]`);
                });
            });

            return t;
        },
        anonymizedText() {
            if (this.mode === 'pseudonymize') {
                return this.pseudonymizedText();
            }
            
            let anonymized = this.text;

            // For each entity, first replace the full multi-word span with a single placeholder (id_type)
            // Then, replace remaining partial word occurrences with suffixed placeholders (id_type_a, id_type_b, ...)
            this.entities.forEach(entity => {
                if (!entity.name) return; // Skip if name is undefined/null/empty

                // Split entity name into words by whitespace or hyphen
                const words = entity.name.split(/\s+|-/).filter(w => w && w.trim().length > 0);
                const basePlaceholder = `<span class="badge badge-outline">${entity.id}_${entity.type}</span>`;

                // Helper to escape regex special chars for whole-word matching
                const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const letters = 'abcdefghijklmnopqrstuvwxyz';

                if (words.length > 1) {
                    // Build a full name regex: \bword1[\s-]+word2[\s-]+...\b to match the entire span
                    const fullJoined = words.map(w => escapeRegex(w)).join('[\\s-]+');
                    const fullPattern = new RegExp(`\\b${fullJoined}\\b`, 'gi');
                    // Replace full multi-word span with a sequence of suffixed placeholders (e.g., 1_person_a 1_person_b)
                    const sequence = words
                        .map((_, idx) => `<span class=\"badge badge-outline\">${entity.id}_${entity.type}_${letters[idx] || String(idx + 1)}</span>`)
                        .join(' ');
                    anonymized = anonymized.replace(fullPattern, sequence);
                } else if (words.length === 1) {
                    // Single-word entity: just replace the word with base placeholder
                    const singleWordPattern = new RegExp(`\\b${escapeRegex(words[0])}\\b`, 'gi');
                    anonymized = anonymized.replace(singleWordPattern, basePlaceholder);
                }

                // Now handle partial occurrences: replace remaining standalone words with suffixed placeholders
                words.forEach((w, idx) => {
                    const suffix = letters[idx] || String(idx + 1); // fallback to numbers if more than 26
                    const suffixedPlaceholder = `<span class=\"badge badge-outline\">${entity.id}_${entity.type}_${suffix}</span>`;
                    const wordPattern = new RegExp(`\\b${escapeRegex(w)}\\b`, 'gi');
                    anonymized = anonymized.replace(wordPattern, suffixedPlaceholder);
                });
            });

            // If an entity is selected in the list, highlight its badges in the preview
            if (this.activeHighlightEntityId != null) {
                anonymized = anonymized.replace(/<span class="badge badge-outline">(\d+)_([^<]+)<\/span>/g, (m, id, rest) => {
                    return Number(id) === this.activeHighlightEntityId
                        ? `<span class="badge badge-outline badge-warning">${id}_${rest}</span>`
                        : m;
                });
            }

            return anonymized;
        },
        // Security: Check if copying output is allowed
        canCopyOutput() {
            // In anonymize mode, check both unrestricted status and scroll review
            if (this.mode === 'anonymize') {
                // If unrestricted, always allow
                if (this.isUnrestricted) {
                    return true;
                }
                // If restricted mode is active
                // Block if scroll review is enabled AND not yet fully reviewed
                if (this.scrollReview.enabled && !this.scrollReview.isFullyReviewed) {
                    return false; // Blocked until fully scrolled
                }
                // Otherwise allow (review completed or not required)
                return true;
            }
            // In pseudonymize/reverse mode, always allow copy
            return true;
        },
        // Security: Check if pasting input is allowed
        canPasteInput() {
            // In pseudonymize/reverse mode, only allow paste if unrestricted
            if (this.mode === 'pseudonymize') {
                return this.isUnrestricted;
            }
            // In anonymize mode, always allow paste
            return true;
        },
        // Check if text is actually anonymized (has entities and placeholders)
        isTextAnonymized() {
            if (this.mode !== 'anonymize') {
                return false;
            }
            const entitiesCount = Array.isArray(this.entities) ? this.entities.length : 0;
            const hasPlaceholderByRegex = /\[\d+_[^\]]+\]/.test(this.anonymizedTextPlain || '');
            return entitiesCount > 0 && hasPlaceholderByRegex;
        },
        // Check if Quick Infer button should be available
        canQuickInfer() {
            // 1. Gemini API Key must be present
            if (!this.hasGeminiKey) return false;

            // 2. At least one prompt must exist
            if (!this.availablePrompts || this.availablePrompts.length === 0) return false;

            // 3. Text must be anonymized (same check as copy button)
            if (!this.isTextAnonymized) return false;

            // 4. In UNRESTRICTED mode: no review required, button is available immediately
            if (!this.scrollReview.enabled) {
                return true;
            }

            // 5. In RESTRICTED mode: review must be completed
            return this.scrollReview.isFullyReviewed;
        },
        // Get most recent prompt (prompts are sorted by updatedAt DESC)
        mostRecentPrompt() {
            if (!this.availablePrompts || this.availablePrompts.length === 0) return null;
            return this.availablePrompts[0];
        },
        // Get selected prompt or fallback to most recent
        currentQuickInferPrompt() {
            if (this.selectedPromptId) {
                const found = this.availablePrompts.find(p => p.id === this.selectedPromptId);
                if (found) return found;
            }
            return this.mostRecentPrompt;
        }
    },
    methods: {
        switchToAnonymize() {
            try {
                // Always restore the text that was present when leaving anonymize mode
                this.text = this.savedInputText;
                this.mode = 'anonymize';
            } catch (e) {
                console.error('Error in switchToAnonymize:', e);
            }
        },
        switchToPseudonymize() {
            try {
                // Only save the text when transitioning from anonymize -> pseudonymize
                if (this.mode === 'anonymize') {
                    this.savedInputText = this.text;
                }
                // Clear input text when switching to de-anonymize mode
                this.text = '';
                this.mode = 'pseudonymize';
            } catch (e) {
                console.error('Error in switchToPseudonymize:', e);
            }
        },
        // Enhanced toast method (same as PromptLibraryModal)
        showToast(msg, opts = {}) {
            try {
                if (this._toastTimer) {
                    clearTimeout(this._toastTimer);
                    this._toastTimer = null;
                }
                this.toastMessage = msg;
                this.toastType = opts.type || 'info';
                this.toastDetail = opts.detail || '';
                this.toastVisible = true;
                this.toastLoading = opts.loading === true;

                const sticky = opts.sticky === true || opts.duration === 0;
                if (!sticky) {
                    const ms = typeof opts.duration === 'number' ? opts.duration : 2500;
                    this._toastTimer = setTimeout(() => {
                        this.toastVisible = false;
                        this._toastTimer = null;
                        this.toastLoading = false;
                    }, ms);
                }
            } catch(_) {}
        },
        // Alias for backwards compatibility
        showInfoToast(message) {
            this.showToast(message);
        },
        // Handle toast click (show details)
        onToastClick() {
            if (this.toastDetail) {
                try {
                    alert(this.toastDetail);
                } catch (e) {
                    console.log('Toast detail:', this.toastDetail);
                }
            }
        },
        hideToast() {
            if (this._toastTimer) {
                clearTimeout(this._toastTimer);
                this._toastTimer = null;
            }
            this.toastVisible = false;
            this.toastMessage = null;
        },
        // Persist the live anonymized/plain output and metadata so other components can consume it
        persistCurrentOutput() {
            try {
                const val = this.anonymizedTextPlain || '';
                localStorage.setItem('anon.currentOutputText', val);
                const entitiesCount = Array.isArray(this.entities) ? this.entities.length : 0;
                const hasPlaceholder = /\[\d+_[^\]]+\]/.test(val || '');
                localStorage.setItem('anon.currentEntitiesCount', String(entitiesCount));
                localStorage.setItem('anon.currentHasPlaceholder', String(hasPlaceholder));
                localStorage.setItem('anon.currentMode', this.mode || '');
                // Also timestamp for reference
                localStorage.setItem('anon.currentUpdatedAt', String(Date.now()));
            } catch (e) {
                console.warn('Failed to persist current anon output:', e);
            }
        },
        async initGliner() {
            // Check if we already have a cached instance for the selected model
            if (this.glinerInstances[this.selectedModel]) {
                console.log(`Using cached Gliner instance for ${this.selectedModel} model`);
                this.gliner = this.glinerInstances[this.selectedModel];
                return;
            }

            try {
                console.log(`Initializing Gliner for ${this.selectedModel} model...`);
                this.downloading = true;
                this.downloadProgress = 0;
                this.downloadStatus = 'Initializing...';
                this.initError = null;
                
                const modelPath = this.selectedModel === 'quantized' 
                    ? "./models/gliner_multi_pii-v1/onnx/model_fp16.onnx"
                    : "./models/gliner_multi_pii-v1/onnx/model.onnx";
                
                // Pre-load the ONNX model using our cache
                this.downloadStatus = 'Loading ONNX model...';
                let modelData = await modelCache.getOrDownloadModel(
                    modelPath, 
                    this.selectedModel,
                    (progress) => {
                        this.downloadProgress = Math.min(progress * 0.8, 80); // Use 80% for model download
                    }
                );
                
                // Force garbage collection before creating blob to free memory
                if (window.gc) {
                    try {
                        window.gc();
                    } catch (e) {
                        // Ignore errors
                    }
                }
                
                // Create a Blob URL for the cached model data
                const modelBlob = new Blob([modelData], { type: 'application/octet-stream' });
                const modelUrl = URL.createObjectURL(modelBlob);
                
                // Clear the modelData reference to help with memory management
                modelData = null;
                
                this.downloadProgress = 85;
                this.downloadStatus = 'Loading tokenizer...';
                
                // Improved backend detection and fallback
                let executionProviders = ['wasm']; // Start with basic WASM as most compatible
                
                // Check for WebGPU support with proper validation
                if ('gpu' in navigator) {
                    try {
                        // Add webgpu as preferred if available
                        executionProviders.unshift('webgpu');
                        console.log('WebGPU detected, will attempt webgpu backend with wasm fallback');
                    } catch (e) {
                        console.log('WebGPU API present but not functional, using wasm only');
                    }
                } else {
                    console.log('WebGPU not available, using wasm backend');
                }
                
                console.log(`Using execution providers: ${executionProviders.join(', ')}`);
                
                const newGliner = new Gliner({
                    tokenizerPath: "./gliner_multi_pii-v1",
                    onnxSettings: {
                        modelPath: modelUrl, // Use the blob URL instead of the original path
                        wasmPaths: {
                            cpu: "./models/gliner_multi_pii-v1/onnx/cpu.wasm",
                            gpu: "./models/gliner_multi_pii-v1/onnx/gpu.wasm",
                        },
                        executionProviders: executionProviders,
                        // Add additional ONNX runtime options for better compatibility
                        sessionOptions: {
                            enableCpuMemArena: false,
                            enableMemPattern: false,
                            graphOptimizationLevel: 'basic'
                        }
                    },
                    transformersSettings: {
                        useBrowserCache: true,
                        allowLocalModels: true,
                        allowRemoteModels: false,
                    },
                    maxWidth: 12,
                });
                
                this.downloadProgress = 95;
                this.downloadStatus = 'Initializing model...';
                
                await newGliner.initialize();
                
                // Clean up the blob URL
                URL.revokeObjectURL(modelUrl);
                
                // Mark which model type this instance is for
                newGliner._modelType = this.selectedModel;
                
                // Cache the initialized instance
                this.glinerInstances[this.selectedModel] = newGliner;
                this.gliner = newGliner;
                
                this.downloadProgress = 100;
                this.downloadStatus = 'Complete!';
                
                // Brief delay to show completion
                setTimeout(() => {
                    this.downloading = false;
                    this.downloadProgress = 0;
                    this.downloadStatus = '';
                }, 500);
                
                console.log(`Gliner initialized and cached successfully for ${this.selectedModel} model`);
            } catch (error) {
                console.error('Failed to initialize Gliner:', error);
                
                // Handle specific backend and memory errors
                if (error.message && error.message.includes('no available backend found')) {
                    this.initError = 'No compatible backend found. Please ensure your browser supports WebAssembly or try a different browser.';
                } else if (error.message && error.message.includes('WebGPU is not supported')) {
                    this.initError = 'WebGPU not supported. Falling back to WebAssembly backend. Please refresh the page.';
                } else if (error.message && (error.message.includes('out of memory') || error.message.includes('ERR_OUT_OF_MEMORY'))) {
                    this.initError = 'Not enough memory to load this model. Try closing other browser tabs or use a smaller model.';
                } else if (error.message && error.message.includes('Failed to fetch')) {
                    this.initError = 'Failed to load the model. This may be due to memory constraints or network issues.';
                } else if (error.message && (error.message.includes('backend') || error.message.includes('execution provider'))) {
                    this.initError = 'Backend initialization failed. Your browser may not support the required features. Try refreshing or using a different browser.';
                } else {
                    this.initError = 'Failed to initialize the Anonymization model. Please check the console for details.';
                }
                
                this.gliner = null;
                this.downloading = false;
                this.downloadProgress = 0;
                this.downloadStatus = '';
                
                // Force garbage collection if available
                if (window.gc) {
                    try {
                        window.gc();
                    } catch (e) {
                        // Ignore errors
                    }
                }
            }
        },
        selectModel(model) {
            if (this.downloading || this.loading) return;
            
            this.selectedModel = model;
            // Switch to cached instance if available, otherwise initGliner will handle it
            if (this.glinerInstances[model]) {
                this.gliner = this.glinerInstances[model];
            }
        },
        setTextSelection() {
            let selection = window.getSelection().toString();
            if (selection) {
                this.newEntityName = selection;
            }
        },
        setTextareaSelection() {
            let start = this.$refs.textArea.selectionStart;
            let end = this.$refs.textArea.selectionEnd;
            if (start !== end) {
                this.newEntityName = this.text.substring(start, end);
            }
        },
        // Scroll the entity list to a given entity and briefly highlight it
        scrollToEntity(entityId) {
            this.$nextTick(() => {
                const list = this.$refs.entityList;
                const card = document.getElementById(`entity-${entityId}`);
                if (!list || !card) return;

                const listRect = list.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
                const offset = (cardRect.top - listRect.top) + list.scrollTop - 16; // 16px padding

                list.scrollTo({ top: offset, behavior: 'smooth' });

                this.highlightedEntityId = entityId;
                if (this._highlightTimer) window.clearTimeout(this._highlightTimer);
                this._highlightTimer = window.setTimeout(() => {
                    this.highlightedEntityId = null;
                }, 1500);
            });
        },
        // Scroll the output preview to the first occurrence of a given entity's badge
        // Cycle through all occurrences of an entity's badge in the output preview
        scrollOutputToNextEntityOccurrence(entityId) {
            const container = this.$refs.textContainer;
            if (!container) return;

            const prefix = `${entityId}_`;
            const badges = Array.from(container.querySelectorAll('span.badge'))
                .filter(el => (el.textContent || '').trim().startsWith(prefix));

            if (badges.length === 0) return;

            // Initialize per-entity index map
            if (!this._entityOccurrenceIndex) this._entityOccurrenceIndex = {};
            const current = this._entityOccurrenceIndex[entityId] ?? -1;
            let nextIndex = current + 1;

            if (nextIndex >= badges.length) {
                // Inform user that all placeholders were clicked through, then wrap
                this.showInfoToast('Alle Platzhalter dieser Entität wurden durchgeklickt. Zurück zum ersten.');
                nextIndex = 0;
            }

            const targetEl = badges[nextIndex];
            this._entityOccurrenceIndex[entityId] = nextIndex;

            // Smoothly scroll the badge into view and center it
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Brief visual pulse to draw attention
            targetEl.classList.add('ring', 'ring-warning');
            window.setTimeout(() => targetEl.classList.remove('ring', 'ring-warning'), 800);
        },
        onEntityClick(entity) {
            // If switching to a different entity, reset its cycling index so we start from the first
            if (this.activeHighlightEntityId !== entity.id) {
                if (!this._entityOccurrenceIndex) this._entityOccurrenceIndex = {};
                this._entityOccurrenceIndex[entity.id] = -1;
            }

            // Toggle highlight if clicking the same entity again
            if (this.activeHighlightEntityId === entity.id) {
                // Keep highlight active and move to next occurrence
            } else {
                this.activeHighlightEntityId = entity.id;
            }

            // Only attempt to scroll when anonymized badges are visible
            if (this.mode === 'anonymize') {
                this.$nextTick(() => {
                    this.scrollOutputToNextEntityOccurrence(entity.id);
                });
            }
        },
        // Handle clicks on badges in the output preview
        onOutputClick(e) {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            if (!target.classList.contains('badge') || !target.classList.contains('badge-outline')) return;
            const text = (target.textContent || '').trim();
            const m = text.match(/^(\d+)_([^_\s]+)(?:_.+)?$/);
            if (!m) return;
            const entityId = Number(m[1]);
            if (!Number.isNaN(entityId)) this.scrollToEntity(entityId);
        },
        // Handle clicks inside the input textarea to detect [id_type] tokens
        onInputClick() {
            const ta = this.$refs.textArea;
            if (!ta) return;
            const value = this.text || '';
            const pos = ta.selectionStart;
            if (pos == null) return;

            // Expand to nearest [ ... ] around cursor
            let left = pos, right = pos;
            while (left > 0 && value[left - 1] !== '[' && value[left - 1] !== '\n') left--;
            while (right < value.length && value[right] !== ']' && value[right] !== '\n') right++;
            if (value[left - 1] === '[') left--; // include '[' if we stopped before it
            if (value[right] === ']') right++; // include ']'

            const token = value.slice(left, right);
            const m = token.match(/^\[(\d+)_([^\]_]+)(?:_[^\]]+)?\]$/);
            if (!m) return;
            const entityId = Number(m[1]);
            if (!Number.isNaN(entityId)) this.scrollToEntity(entityId);
        },
        handlePaste(event) {
            // Prevent default paste behavior
            event.preventDefault();

            // Get pasted text from clipboard
            const pastedText = event.clipboardData?.getData('text') || '';
            if (!pastedText) return;

            // Remove hyphenation: only hyphens that have letters on both sides
            // Pattern: letter - optional newline - lowercase letter
            // Keep hyphens before uppercase letters (e.g. "Master-Prompt", "WC-Schüssel")
            const hyphenationPattern = /([a-zA-ZäöüÄÖÜß])-\n?([a-zäöüß])/g;

            // Count how many replacements we make
            let count = 0;
            const cleanedText = pastedText.replace(hyphenationPattern, (match, before, after) => {
                count++;
                return before + after;
            });

            // Get current cursor position
            const ta = this.$refs.textArea;
            if (!ta) return;

            const start = ta.selectionStart;
            const end = ta.selectionEnd;

            // Insert cleaned text at cursor position
            const currentText = this.text || '';
            this.text = currentText.substring(0, start) + cleanedText + currentText.substring(end);

            // Restore cursor position (after inserted text)
            this.$nextTick(() => {
                const newPos = start + cleanedText.length;
                ta.selectionStart = ta.selectionEnd = newPos;
                ta.focus();
            });

            // Show toast if hyphenations were removed
            if (count > 0) {
                this.showInfoToast(`${count} Worttrennungen entfernt`);
            }
        },
        async getEntities() {
            this.loading = true;
            
            try {
                // Start with empty entities array
                let allEntities = [];
                let entityId = 1;
                
                // 1. Get AI-detected entities if model is available and labels are selected
                if (this.selectedLabels.length > 0) {
                    // Only initialize if we don't have a cached instance for the current model
                    if (!this.glinerInstances[this.selectedModel]) {
                        await this.initGliner();
                    } else {
                        // Use cached instance
                        this.gliner = this.glinerInstances[this.selectedModel];
                    }
                    
                    if (!this.gliner) {
                        console.error('Model failed to initialize');
                    } else {
                        const MAX_CHUNK_LENGTH = 12000; // Change if needed, tested on MacBook Pro M4, Chromium Engine Version 137.0.7151.56 

                        // Function to split text into chunks of a maximum length
                        function splitTextIntoChunks(text, maxLength) {
                            const chunks = [];
                            for (let i = 0; i < text.length; i += maxLength) {
                                chunks.push(text.substring(i, i + maxLength));
                            }
                            return chunks;
                        }

                        // Use Gliner.inference for entity detection with selected labels only
                        const textChunks = splitTextIntoChunks(this.text, MAX_CHUNK_LENGTH);
                        let entityId = 0;

                        for (const chunk of textChunks) {
                            console.log("Running chunk through GLiNER Inference...")
                            const results = await this.gliner.inference({
                                texts: [chunk],
                                entities: this.selectedLabels,
                                threshold: 0.1,
                            });

                            // results is an array of arrays - get the first text's results
                            const aiEntities = results[0].map((ent) => ({
                                id: entityId++,
                                name: ent.spanText,
                                type: ent.label,
                                source: 'ai'
                            }));
                            
                            allEntities.push(...aiEntities);
                        }
                    }
                }
                
                // 2. Get regex-detected entities
                if (this.customRegexPatterns.length > 0) {
                    const regexEntities = await this.findRegexEntities();
                    // Update IDs to continue from AI entities
                    regexEntities.forEach(entity => {
                        entity.id = entityId++;
                    });
                    allEntities.push(...regexEntities);
                }
                
                // 3. Merge existing entities with newly detected ones (cumulative update)
                const existingEntities = [...this.entities];
                const dedupedNewEntities = this.removeDuplicateEntities(allEntities);
                this.entities = this.mergeEntities(existingEntities, dedupedNewEntities);
                
            } catch (e) {
                console.error('Error during entity detection:', e);
            } finally {
                this.loading = false;

                // Initialize scroll review after anonymization completes (Restricted Mode feature)
                // BUT: Don't reset if review is already in progress (user adding entities during review)
                if (!this.scrollReview.enabled || this.scrollReview.zones.length === 0) {
                    this.$nextTick(() => {
                        this.initScrollReview();
                    });
                }

                // Show notification when entity detection completes (only if window is in background)
                try {
                    const entityCount = this.entities ? this.entities.length : 0;
                    notificationService.notifyEntityDetectionCompleteIfHidden(entityCount);
                } catch (e) {
                    console.warn('Failed to show entity detection notification:', e);
                }

                // Auto-sync entities to case if enabled
                await this.autoSyncEntities();
            }
        },
        removeDuplicateEntities(entities) {
            // Simple deduplication based on entity name and type
            const seen = new Set();
            return entities.filter(entity => {
                const key = `${entity.name.toLowerCase()}_${entity.type}`;
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        },
        mergeEntities(existingEntities, newEntities) {
            // Merge existing entities with new ones (cumulative)
            // Existing entities are preserved WITH their original IDs for case consistency
            const seen = new Set();
            const merged = [];

            // Step 1: Keep all existing entities WITH their original IDs
            existingEntities.forEach(entity => {
                const key = `${entity.name.toLowerCase()}_${entity.type}`;
                seen.add(key);
                merged.push(entity);
            });

            // Step 2: Add only new, unique entities with new IDs
            // Find max ID to avoid conflicts
            const maxId = existingEntities.length > 0
                ? Math.max(...existingEntities.map(e => e.id || 0))
                : 0;

            let nextId = maxId + 1;
            newEntities.forEach(entity => {
                const key = `${entity.name.toLowerCase()}_${entity.type}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    merged.push({
                        ...entity,
                        id: nextId++
                    });
                }
            });

            // Step 3 REMOVED: IDs remain stable across documents for case consistency
            return merged;
        },
        addEntity() {
            if (this.newEntityName.trim()) {
                // Find max ID to avoid conflicts (especially after deletions)
                const maxId = this.entities.length > 0
                    ? Math.max(...this.entities.map(e => e.id || 0))
                    : 0;

                this.entities.push({
                    id: maxId + 1,
                    name: this.newEntityName,
                    type: this.newEntityType
                });
                this.newEntityName = '';

                // Auto-sync after adding entity
                this.autoSyncEntities();
            }
        },
        removeEntity(id) {
            this.entities = this.entities.filter(e => e.id !== id);

            // Auto-sync after removing entity
            this.autoSyncEntities();
        },
        copy() {
            // Restricted Mode: Block copying in anonymize mode
            if (!this.canCopyOutput) {
                this.showInfoToast('Copying disabled in Restricted Mode. Unlock in Settings to enable.');
                return;
            }

            try {
                const textToCopy = this.anonymizedTextPlain;

                // Security check (same logic as in PromptLibraryModal.inferWithGemini):
                // In Anonymize mode, prevent copying if text appears not anonymized
                if (this.mode === 'anonymize') {
                    const entitiesCount = Array.isArray(this.entities) ? this.entities.length : 0;
                    const hasPlaceholderByRegex = /\[\d+_[^\]]+\]/.test(textToCopy || '');
                    if (entitiesCount <= 0 || !hasPlaceholderByRegex) {
                        const msg = 'Kopieren blockiert: Der Text scheint nicht anonymisiert zu sein. Bitte fügen Sie Entitäten hinzu und anonymisieren Sie den Text, bevor Sie ihn kopieren.';
                        try { this.showInfoToast(msg); } catch (_) { try { alert(msg); } catch (_) {} }
                        return;
                    }
                }

                navigator.clipboard.writeText(textToCopy);
                // Persist the last exported anonymized text for Prompt Library inference
                try {
                    localStorage.setItem('anon.lastExportText', textToCopy || '');
                    localStorage.setItem('anon.lastExportAt', String(Date.now()));
                    // Security metadata
                    const entitiesCount = Array.isArray(this.entities) ? this.entities.length : 0;
                    const hasPlaceholder = /\[\d+_[^\]]+\]/.test(textToCopy || '');
                    localStorage.setItem('anon.lastExportEntitiesCount', String(entitiesCount));
                    localStorage.setItem('anon.lastExportHasPlaceholder', String(hasPlaceholder));
                    localStorage.setItem('anon.lastExportMode', this.mode || ''); // should be 'anonymize' when exporting
                } catch (e) {
                    console.warn('Failed to persist last exported text:', e);
                }
            } catch (e) {
                console.error('Copy failed:', e);
            }
        },
        // Load available prompts for Quick Infer
        async loadPrompts() {
            try {
                this.availablePrompts = await promptCache.list();
                console.log('[Anon] Loaded prompts:', this.availablePrompts.length);

                // Auto-select most recent prompt if none selected
                if (!this.selectedPromptId && this.availablePrompts.length > 0) {
                    this.selectedPromptId = this.availablePrompts[0].id;
                    console.log('[Anon] Auto-selected most recent prompt:', this.availablePrompts[0].title);
                }
            } catch (e) {
                console.error('[Anon] Failed to load prompts:', e);
            }
        },
        // Load available text blocks for Quick Infer
        async loadTextBlocks() {
            try {
                this.textBlocks = await textBlockCache.list();
                console.log('[Anon] Loaded text blocks:', this.textBlocks.length);
            } catch (e) {
                console.error('[Anon] Failed to load text blocks:', e);
            }
        },
        // Load cached text block selections (same as PromptLibraryModal)
        loadCachedTextBlockSelections() {
            try {
                const cached = localStorage.getItem('promptLibrary.textBlockSelections');
                if (!cached) {
                    console.log('[Anon] No cached text block selections found');
                    return;
                }

                const selections = JSON.parse(cached);
                console.log('[Anon] Loaded cached text block selections:', selections);

                // Validate that cached text blocks still exist
                const validTextBlockIds = new Set(this.textBlocks.map(tb => tb.id));

                let restoredCount = 0;
                for (const [promptId, textBlockId] of Object.entries(selections)) {
                    if (validTextBlockIds.has(textBlockId)) {
                        this.selectedTextBlocks[promptId] = textBlockId;
                        restoredCount++;
                    } else {
                        console.log('[Anon] Skipping invalid text block:', textBlockId, 'for prompt:', promptId);
                    }
                }
                console.log('[Anon] Restored', restoredCount, 'text block selections');
            } catch (e) {
                console.warn('[Anon] Failed to load cached text block selections:', e);
            }
        },
        // Quick Infer: Run inference with selected or most recent prompt
        async quickInfer() {
            const prompt = this.currentQuickInferPrompt;
            if (!prompt) {
                this.showInfoToast('No prompt available for Quick Infer.');
                return;
            }

            console.log('[Anon] Quick Infer with prompt:', prompt.title);

            try {
                await geminiInferenceService.inferWithPrompt(prompt, {
                    showToast: this.showToast.bind(this),
                    onResult: (responseText) => {
                        // Handle inference result - same as PromptLibraryModal
                        this.handlePromptInferred(responseText);
                    },
                    selectedTextBlocks: this.selectedTextBlocks,
                    textBlocks: this.textBlocks
                });
            } catch (e) {
                console.error('[Anon] Quick Infer error:', e);
                this.showInfoToast('Error during Quick Infer.');
            }
        },
        // Toggle Quick Infer dropdown
        toggleQuickInferDropdown() {
            this.showQuickInferDropdown = !this.showQuickInferDropdown;
        },
        // Select prompt from dropdown (user must click main button again to trigger)
        selectPrompt(promptId) {
            this.selectedPromptId = promptId;
            this.showQuickInferDropdown = false;
            console.log('[Anon] Prompt selected:', promptId, '- click main button to run inference');
        },
        // Get button title/tooltip for Quick Infer
        getQuickInferButtonTitle() {
            if (!this.hasGeminiKey) {
                return 'Gemini API key missing. Add it in Settings.';
            }
            if (!this.availablePrompts || this.availablePrompts.length === 0) {
                return 'No prompts available. Create prompts in Prompt Library.';
            }
            if (!this.isTextAnonymized) {
                return 'Text must be anonymized first.';
            }
            if (this.scrollReview.enabled && !this.scrollReview.isFullyReviewed) {
                return 'Please review anonymized text by scrolling through it first (Restricted Mode).';
            }
            const prompt = this.currentQuickInferPrompt;
            return prompt ? `Quick Infer with: ${prompt.title}` : 'Quick Infer';
        },
        pseudonymizedText() {
            let pseudonymized = this.text;
            
            // Replace placeholders with entity values, supporting suffixed parts (_a, _b, ...)
            this.entities.forEach(entity => {
                if (!entity.name) return; // Skip if replacement value is empty

                const words = entity.name.split(/\s+|-/).filter(w => w && w.trim().length > 0);
                const letters = 'abcdefghijklmnopqrstuvwxyz';

                // 1) Replace suffixed placeholders first (e.g., 1_person_a) with corresponding word
                words.forEach((w, idx) => {
                    const suffix = letters[idx] || String(idx + 1);
                    const bracketSuffixed = new RegExp(`\\[${entity.id}_${entity.type}_${suffix}\\]`, 'g');
                    const badgeSuffixed = new RegExp(`<span class=\\"badge badge-outline\\">${entity.id}_${entity.type}_${suffix}</span>`, 'g');
                    pseudonymized = pseudonymized.replace(bracketSuffixed, w);
                    pseudonymized = pseudonymized.replace(badgeSuffixed, w);
                });

                // 2) Now replace base placeholders (e.g., 1_person) with the full entity name
                const bracketBase = new RegExp(`\\[${entity.id}_${entity.type}\\]`, 'g');
                const badgeBase = new RegExp(`<span class=\\"badge badge-outline\\">${entity.id}_${entity.type}</span>`, 'g');
                pseudonymized = pseudonymized.replace(bracketBase, entity.name);
                pseudonymized = pseudonymized.replace(badgeBase, entity.name);

                // 3) Optional: If we encounter sequences of base placeholders that don't match word count,
                //    try to replace them with corresponding parts. This is a conservative fallback.
                //    Example: [1_person][1_person] should become "Hans Müller" if entity has two words.
                if (words.length > 1) {
                    const seq = Array(words.length).fill(`<span class=\\"badge badge-outline\\">${entity.id}_${entity.type}</span>`).join('');
                    const seqRegex = new RegExp(seq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                    pseudonymized = pseudonymized.replace(seqRegex, entity.name);
                    const bracketSeq = Array(words.length).fill(`[${entity.id}_${entity.type}]`).join('');
                    const bracketSeqRegex = new RegExp(bracketSeq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                    pseudonymized = pseudonymized.replace(bracketSeqRegex, entity.name);
                }
            });
            
            return pseudonymized;
        },
        detectPlaceholders() {
            // Find all placeholders in the text using regex pattern [number_type] and normalize optional suffixes (_a, _b, ...)
            const placeholderRegex = /\[(\d+)_([^\]]+)\]/g;
            const foundPlaceholders = new Map(); // id_typeBase -> Set of suffixes seen
            let match;
            
            while ((match = placeholderRegex.exec(this.text)) !== null) {
                const id = parseInt(match[1]);
                const rawType = match[2];
                const suffixMatch = rawType.match(/^(.*?)(?:_([a-z]))?$/i);
                const typeBase = suffixMatch ? suffixMatch[1] : rawType;
                const suffix = suffixMatch && suffixMatch[2] ? suffixMatch[2].toLowerCase() : null;
                const key = `${id}_${typeBase}`;
                if (!foundPlaceholders.has(key)) foundPlaceholders.set(key, new Set());
                if (suffix) foundPlaceholders.get(key).add(suffix);
            }
            
            // Clear existing entities and create new ones from placeholders (base types only)
            this.entities = Array.from(foundPlaceholders.keys()).map(key => {
                const [idStr, typeBase] = key.split('_');
                return {
                    id: parseInt(idStr),
                    name: '', // Empty name for user to fill in
                    type: typeBase
                };
            }).sort((a, b) => a.id - b.id);
        },
        clearEntities() {
            const confirmed = window.confirm('Möchten Sie wirklich alle Entitäten löschen? Diese Aktion kann nicht rückgängig gemacht werden.');
            if (!confirmed) return;
            this.entities = [];
        },
        clearText(){
            this.text = '';
        },
        clearMarkdown(){
            if (!this.text) return;
            this.text = this.stripMarkdown(this.text);
        },
        async pasteFromClipboard() {
            // Restricted Mode: Block pasting in pseudonymize/reverse mode
            if (!this.canPasteInput) {
                this.showInfoToast('Pasting disabled in Restricted Mode. Unlock in Settings to enable.');
                return;
            }

            try {
                if (!navigator.clipboard || !navigator.clipboard.readText) {
                    alert('Zwischenablagezugriff nicht verfügbar. Bitte fügen Sie mit Strg/Cmd+V ein.');
                    return;
                }
                const clip = await navigator.clipboard.readText();
                if (this.text && this.text.length > 0) {
                    const ok = confirm('Zwischenablage einfügen und bestehenden Text ersetzen?');
                    if (!ok) return;
                }
                this.text = clip || '';
                this.$nextTick(() => {
                    try { this.$refs.textArea && this.$refs.textArea.focus(); } catch (e) {}
                });
            } catch (e) {
                alert('Konnte nicht auf die Zwischenablage zugreifen. Bitte fügen Sie den Text manuell mit Strg/Cmd+V ein.\n' + (e && (e.message || e)));
            }
        },
        stripMarkdown(input) {
            if (!input) return '';
            let t = input;
            // Remove fenced code blocks but keep inner text
            t = t.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, '').replace(/^\s*\n?/,'').replace(/\n?\s*$/,''));
            // Remove inline code backticks
            t = t.replace(/`([^`]*)`/g, '$1');
            // Headers at start of line
            t = t.replace(/^#{1,6}\s*/gm, '');
            // Setext headers (=== or --- on their own line)
            t = t.replace(/^\s*(=|-){2,}\s*$/gm, '');
            // Blockquotes
            t = t.replace(/^\s*>+\s?/gm, '');
            // Lists (bulleted and numbered)
            t = t.replace(/^(\s*)([-+*]|\d+\.)\s+/gm, '$1');
            // Horizontal rules
            t = t.replace(/^\s*([-_*]){3,}\s*$/gm, '');
            // Emphasis and strong
            t = t.replace(/(\*\*|__)(.*?)\1/g, '$2');
            t = t.replace(/(\*|_)(.*?)\1/g, '$2');
            // Strikethrough
            t = t.replace(/~~(.*?)~~/g, '$1');
            // Links and images -> keep label/alt text
            t = t.replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1');
            t = t.replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1');
            // Tables: remove pipes and alignment lines
            t = t.replace(/^\s*\|/gm, '');
            t = t.replace(/\|\s*$/gm, '');
            t = t.replace(/^\s*[-|: ]+\s*$/gm, '');
            t = t.replace(/ \| /g, '  ');
            // Escaped markdown characters (\* etc.) -> unescape
            t = t.replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, '$1');
            // Trim trailing spaces produced by removals
            t = t.replace(/[\t ]+$/gm, '');
            return t;
        },
        triggerFileInput() {
            if (!this.fileProcessing) {
                this.$refs.fileInput.click();
            }
        },
        handleDragOver(event) {
            this.dragOver = true;
        },
        handleDragLeave(event) {
            this.dragOver = false;
        },
        handleFileDrop(event) {
            this.dragOver = false;
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        },
        async handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            this.processFile(file);
        },
        validateFile(file) {
            const allowedTypes = [
                'text/plain',
                'application/pdf', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            const allowedExtensions = ['.txt', '.pdf', '.docx'];
            const maxSize = 50 * 1024 * 1024; // 50MB
            
            this.fileError = null;
            
            if (!allowedTypes.includes(file.type) && !allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
                this.fileError = 'Unsupported file type. Please use TXT, PDF, or DOCX files.';
                return false;
            }
            
            if (file.size > maxSize) {
                this.fileError = 'File size too large. Please use files smaller than 50MB.';
                return false;
            }
            
            return true;
        },
        async processFile(file) {
            if (!this.validateFile(file)) {
                return;
            }
            
            this.fileProcessing = true;
            this.fileError = null;
            
            try {
                let extractedText = '';
                
                if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
                    extractedText = await this.extractTextFromTxt(file);
                } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    extractedText = await this.extractTextFromPdf(file);
                } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) {
                    extractedText = await this.extractTextFromDocx(file);
                }
                
                if (extractedText.trim().length === 0) {
                    this.fileError = 'No text found in the file. Please check the file content.';
                    return;
                }
                
                this.text = extractedText;
                // Do not clear existing entities when a new file is loaded to preserve the entities list per user request
            } catch (error) {
                console.error('Error processing file:', error);
                this.fileError = 'Error processing file. Please try again or check the file format.';
            } finally {
                this.fileProcessing = false;
                // Reset file input
                if (this.$refs.fileInput) {
                    this.$refs.fileInput.value = '';
                }
            }
        },
        async extractTextFromTxt(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        },
        async extractTextFromPdf(file) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            return fullText.trim();
        },
        async extractTextFromDocx(file) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        },
        formatLabel(label) {
            return label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        },
        selectAllLabels() {
            this.selectedLabels = [...this.availableLabels];
        },
        deselectAllLabels() {
            this.selectedLabels = [];
        },
        selectCommonLabels() {
            this.selectedLabels = [
                "person", "location", "organization", "date", "time", 
                "phone number", "email", "address", "credit card number", 
                "social security number", "date of birth", "mobile phone number"
            ];
        },
        applySettings() {
            this.showSettings = false;
            // Clear existing entities when settings change
            this.entities = [];
        },
        validateRegexPattern(pattern) {
            // Basic validation
            if (!pattern || pattern.trim().length === 0) {
                return 'Pattern cannot be empty';
            }
            
            if (pattern.length > 100) {
                return 'Pattern too long (max 100 characters)';
            }
            
            // Check for potentially dangerous patterns
            const dangerousPatterns = [
                /\(\?\=.*\)\*/, // Lookahead with quantifier
                /\(\?\!.*\)\*/, // Negative lookahead with quantifier
                /\(\?\<\=.*\)\*/, // Lookbehind with quantifier
                /\(\?\<\!.*\)\*/, // Negative lookbehind with quantifier
                /\(\.\*\)\+/, // Nested quantifiers
                /\(\.\+\)\*/, // Nested quantifiers
                /\(\.\*\)\{.*\}/, // Quantifiers with ranges on .* 
            ];
            
            for (let dangerous of dangerousPatterns) {
                if (dangerous.test(pattern)) {
                    return 'Pattern may cause performance issues (contains potentially problematic constructs)';
                }
            }
            
            // Try to create the regex to validate syntax
            try {
                new RegExp(pattern);
            } catch (e) {
                return `Invalid regex syntax: ${e.message}`;
            }
            
            return null;
        },
        addRegexPattern() {
            this.regexError = null;
            
            const pattern = this.newRegexPattern.trim();
            const label = this.newRegexLabel.trim() || 'custom';
            
            // Validate pattern
            const validationError = this.validateRegexPattern(pattern);
            if (validationError) {
                this.regexError = validationError;
                return;
            }
            
            // Check for duplicates
            const exists = this.customRegexPatterns.some(p => p.pattern === pattern);
            if (exists) {
                this.regexError = 'Pattern already exists';
                return;
            }
            
            // Build flags
            let flags = '';
            if (this.newRegexGlobal) flags += 'g';
            if (this.newRegexCaseInsensitive) flags += 'i';
            
            // Add pattern
            this.customRegexPatterns.push({
                pattern: pattern,
                label: label,
                flags: flags
            });
            
            // Clear form
            this.newRegexPattern = '';
            this.newRegexLabel = '';
            this.newRegexGlobal = true;
            this.newRegexCaseInsensitive = false;
        },
        removeRegexPattern(index) {
            this.customRegexPatterns.splice(index, 1);
        },
        executeRegexWithTimeout(regex, text, timeoutMs = 1000) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                
                // Set up timeout
                const timeout = setTimeout(() => {
                    reject(new Error('Regex execution timeout'));
                }, timeoutMs);
                
                try {
                    const matches = [];
                    let match;
                    
                    // Reset regex lastIndex to ensure clean start
                    regex.lastIndex = 0;
                    
                    while ((match = regex.exec(text)) !== null) {
                        // Check for timeout during execution
                        if (Date.now() - startTime > timeoutMs) {
                            clearTimeout(timeout);
                            reject(new Error('Regex execution timeout during matching'));
                            return;
                        }
                        
                        matches.push({
                            text: match[0],
                            start: match.index,
                            end: match.index + match[0].length
                        });
                        
                        // Prevent infinite loops with zero-length matches
                        if (match[0].length === 0) {
                            regex.lastIndex++;
                        }
                        
                        // Safety: limit number of matches
                        if (matches.length > 1000) {
                            clearTimeout(timeout);
                            reject(new Error('Too many matches (limit: 1000)'));
                            return;
                        }
                        
                        // Break if not global
                        if (!regex.global) break;
                    }
                    
                    clearTimeout(timeout);
                    resolve(matches);
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        },
        async findRegexEntities() {
            const regexEntities = [];
            let entityId = this.entities.length + 1;
            
            for (const pattern of this.customRegexPatterns) {
                try {
                    const regex = new RegExp(pattern.pattern, pattern.flags);
                    const matches = await this.executeRegexWithTimeout(regex, this.text);
                    
                    for (const match of matches) {
                        regexEntities.push({
                            id: entityId++,
                            name: match.text,
                            type: pattern.label,
                            source: 'regex'
                        });
                    }
                } catch (error) {
                    console.warn(`Regex pattern "${pattern.pattern}" failed:`, error.message);
                    // Continue with other patterns instead of stopping
                }
            }
            
            return regexEntities;
        },
        async getCacheStats() {
            try {
                return await modelCache.getCacheStats();
            } catch (error) {
                console.error('Failed to get cache stats:', error);
                return null;
            }
        },
        async clearModelCache() {
            try {
                await modelCache.clearCache();
                console.log('Model cache cleared successfully');
                return true;
            } catch (error) {
                console.error('Failed to clear cache:', error);
                return false;
            }
        },
        formatCacheSize(bytes) {
            return modelCache.formatBytes(bytes);
        },
        async refreshCacheStats() {
            this.refreshingCache = true;
            try {
                this.cacheStats = await this.getCacheStats();
            } catch (error) {
                console.error('Failed to refresh cache stats:', error);
            } finally {
                this.refreshingCache = false;
            }
        },
        async confirmClearCache() {
            if (confirm('Are you sure you want to clear the model cache? This will remove all cached models and they will need to be downloaded again.')) {
                this.clearingCache = true;
                try {
                    const success = await this.clearModelCache();
                    if (success) {
                        await this.refreshCacheStats();
                        alert('Model cache cleared successfully.');
                    } else {
                        alert('Failed to clear model cache.');
                    }
                } finally {
                    this.clearingCache = false;
                }
            }
        },
        async openSettings() {
            this.showSettings = true;
            try { this.loadGeminiKey(); } catch (e) { console.warn('Failed to load Gemini API key:', e); }
            try { this.loadNotificationSettings(); } catch (e) { console.warn('Failed to load notification settings:', e); }
            await this.refreshCacheStats();
        },
        openPromptLibrary() {
            this.showPromptLibrary = true;
        },
        openTextBlockLibrary() {
            this.showTextBlockLibrary = true;
        },
        openCaseManagement() {
            this.showCaseManagementModal = true;
        },
        async onLoadCase(caseData) {
            // Confirm if entities exist
            if (this.entities.length > 0) {
                if (!confirm('Aktuellen Fall laden? Die bestehende Entitätenliste wird ersetzt.')) {
                    return;
                }
            }

            // Reload case from DB to ensure we have the latest data
            const freshCase = await caseCache.getById(caseData.id);
            if (freshCase) {
                this.activeCase = freshCase;
                this.entities = freshCase.entities || [];
                this.mode = freshCase.mode || 'anonymize';
            } else {
                // Fallback to provided data if DB load fails
                this.activeCase = caseData;
                this.entities = caseData.entities || [];
                this.mode = caseData.mode || 'anonymize';
            }

            this.showCaseManagementModal = false;

            // Save active case ID to localStorage
            try {
                localStorage.setItem('anon.activeCase', this.activeCase.id);
            } catch (e) {
                console.warn('Failed to save active case to localStorage:', e);
            }

            this.showToast(`Fall "${this.activeCase.name}" geladen (${this.entities.length} Entitäten)`);
        },
        onLoadDocument({ content, name }) {
            // Load document content into input text area
            this.text = content;

            if (this.mode === 'anonymize') {
                this.showToast(`Dokument "${name}" in Input-Area geladen`);
            } else {
                this.showToast(`Dokument "${name}" in Input-Area geladen (bereit zur De-Anonymisierung)`);
            }
            this.showCaseManagementModal = false;
        },
        async saveOutputAsDocument() {
            if (!this.activeCase) {
                this.showToast('Kein aktiver Fall geladen', { type: 'error' });
                return;
            }

            const outputContent = this.anonymizedTextPlain;
            if (this.mode !== 'anonymize' || !outputContent || outputContent.trim().length === 0) {
                this.showToast('Nur anonymisierte Texte können gespeichert werden', { type: 'error' });
                return;
            }

            const name = prompt('Dokument-Name:', `Dokument ${new Date().toLocaleDateString('de-DE')}`);
            if (!name) return;

            try {
                await documentCache.create({
                    caseId: this.activeCase.id,
                    name,
                    content: outputContent
                });

                this.showToast(`Dokument "${name}" gespeichert`);
            } catch (err) {
                console.error('[Anon] Error saving document:', err);
                this.showToast('Fehler beim Speichern: ' + err.message, { type: 'error' });
            }
        },
        async loadActiveCase() {
            try {
                const activeCaseId = localStorage.getItem('anon.activeCase');
                if (activeCaseId) {
                    const caseData = await caseCache.getById(activeCaseId);
                    if (caseData) {
                        this.activeCase = caseData;
                        console.log('Active case loaded:', caseData.name);
                    }
                }
            } catch (e) {
                console.warn('Failed to load active case:', e);
            }
        },
        async loadEntitiesFromCase() {
            if (!this.activeCase) return;

            // Confirm if entities already exist
            if (this.entities.length > 0) {
                if (!confirm('Möchten Sie die aktuelle Entitätenliste mit den gespeicherten Entitäten ersetzen?')) {
                    return;
                }
            }

            // Load entities from the case
            this.entities = this.activeCase.entities || [];
            this.mode = this.activeCase.mode || 'anonymize';
            this.showToast(`${this.entities.length} Entitäten vom Fall geladen`);
        },
        async saveEntitiesToCase() {
            if (!this.activeCase) return;
            if (this.entities.length === 0) {
                this.showToast('Keine Entitäten zum Speichern vorhanden', { type: 'error' });
                return;
            }

            try {
                console.log('[Anon] Saving entities to case:', this.activeCase.id);
                console.log('[Anon] Entities count:', this.entities.length);

                await caseCache.update(this.activeCase.id, {
                    entities: this.entities,
                    mode: this.mode
                });

                // Reload the case to update the display
                const updatedCase = await caseCache.getById(this.activeCase.id);
                if (updatedCase) {
                    this.activeCase = updatedCase;
                    console.log('[Anon] Case updated, new entity count:', updatedCase.entities?.length || 0);
                }

                this.showToast(`${this.entities.length} Entitäten im Fall gespeichert`);
            } catch (err) {
                console.error('[Anon] Error saving entities:', err);
                this.showToast('Fehler beim Speichern: ' + err.message, { type: 'error' });
            }
        },
        toggleAutoSync() {
            if (!this.activeCase) return;

            // Simple silent toggle
            this.autoSyncCase = !this.autoSyncCase;

            if (this.autoSyncCase) {
                this.showToast('Auto-Sync aktiviert');
            } else {
                this.showToast('Auto-Sync deaktiviert');
            }
        },
        async autoSyncEntities() {
            // Auto-sync entities to case if enabled
            if (!this.autoSyncCase || !this.activeCase) return;

            try {
                console.log('[Anon] Auto-syncing entities to case:', this.activeCase.id);
                await caseCache.update(this.activeCase.id, {
                    entities: this.entities,
                    mode: this.mode
                });

                // Reload case to update display
                const updatedCase = await caseCache.getById(this.activeCase.id);
                if (updatedCase) {
                    this.activeCase = updatedCase;
                }

                console.log('[Anon] Auto-sync complete:', this.entities.length, 'entities');
            } catch (err) {
                console.error('[Anon] Auto-sync failed:', err);
                this.showToast('Auto-Sync fehlgeschlagen: ' + err.message, { type: 'error' });
            }
        },
        closeActiveCase() {
            if (!this.activeCase) return;

            // Optional: Confirm if user wants to close the case
            if (confirm(`Fall "${this.activeCase.name}" schließen?`)) {
                this.activeCase = null;
                this.autoSyncCase = false; // Reset auto-sync when closing case
                this.showToast('Fall geschlossen');
            }
        },
        handlePromptInsert(content) {
            const sep = this.text && !this.text.endsWith('\n') ? '\n\n' : '';
            this.text = (this.text || '') + sep + content;
            try { this.showInfoToast('Prompt inserted'); } catch (_) { try { alert('Prompt inserted'); } catch (e) {} }
            this.showPromptLibrary = false;
        },
        handlePromptInferred(responseText) {
            try {
                // If we are coming from anonymize mode, remember the user's original input text
                if (this.mode === 'anonymize') {
                    this.savedInputText = this.text;
                }
                // Switch to de-anonymisieren mode and place the response in the input area
                if (this.mode !== 'pseudonymize') {
                    this.mode = 'pseudonymize';
                }
                // Show the LLM's response in the de-anonymize input area without affecting the saved anonymize text
                this.text = responseText || '';
                this.showInfoToast('Gemini response inserted');
                
                // New cumulative action: automatically copy the de-anonymized output to clipboard and inform the user
                try {
                    // Reuse the existing copy() behavior (equivalent to pressing "Text kopieren")
                    this.copy();
                    // Inform the user with a toast
                    this.showInfoToast('Wiederhergestellter Text wurde in die Zwischenablage kopiert');
                } catch (copyErr) {
                    console.warn('Auto-copy after inference failed:', copyErr);
                }
            } catch (e) {
                console.error('Error handling inferred response:', e);
                try { alert('Failed to insert Gemini response'); } catch (_) {}
            } finally {
                this.showPromptLibrary = false;
            }
        },
        // Gemini API key helpers
        loadGeminiKey() {
            try {
                const key = localStorage.getItem('settings.geminiApiKey');
                this.geminiApiKey = key || '';
                const ts = localStorage.getItem('settings.geminiApiKey.savedAt');
                this.geminiKeySavedAt = ts ? Number(ts) : null;
            } catch (e) {
                console.warn('Error loading Gemini API key from localStorage:', e);
            }
        },
        saveGeminiKey() {
            try {
                const trimmed = (this.geminiApiKey || '').trim();
                if (!trimmed) {
                    localStorage.removeItem('settings.geminiApiKey');
                    localStorage.removeItem('settings.geminiApiKey.savedAt');
                    this.geminiKeySavedAt = null;
                    this.showInfoToast('Gemini API key cleared');
                    return;
                }
                localStorage.setItem('settings.geminiApiKey', trimmed);
                const ts = Date.now();
                localStorage.setItem('settings.geminiApiKey.savedAt', String(ts));
                this.geminiKeySavedAt = ts;
                this.showInfoToast('Gemini API key saved');
            } catch (e) {
                console.error('Error saving Gemini API key:', e);
                try { alert('Failed to save Gemini API key.'); } catch (_) {}
            }
        },
        clearGeminiKey() {
            try {
                this.geminiApiKey = '';
                this.saveGeminiKey();
            } catch (e) {
                console.warn('Error clearing Gemini API key:', e);
            }
        },
        // Notification settings helpers
        loadNotificationSettings() {
            try {
                this.notificationSettings = notificationService.loadSettings();
                this.notificationPermissionGranted = notificationService.checkPermission();
            } catch (e) {
                console.warn('Error loading notification settings:', e);
            }
        },
        saveNotificationSettings() {
            try {
                notificationService.saveSettings(this.notificationSettings);
                this.showInfoToast('Benachrichtigungseinstellungen gespeichert');
            } catch (e) {
                console.warn('Error saving notification settings:', e);
            }
        },
        async requestNotificationPermission() {
            try {
                const granted = await notificationService.requestPermission();
                this.notificationPermissionGranted = granted;
                if (granted) {
                    this.showInfoToast('Benachrichtigungsberechtigung erteilt');
                } else {
                    this.showInfoToast('Benachrichtigungsberechtigung verweigert');
                }
            } catch (e) {
                console.warn('Error requesting notification permission:', e);
            }
        },
        sendTestNotification() {
            try {
                // Send a test notification immediately (ignoring document visibility)
                const notification = notificationService.show('Test-Benachrichtigung', {
                    body: 'Wenn Sie diese Nachricht sehen, funktionieren Web-Benachrichtigungen korrekt! 🎉',
                    requireInteraction: false,
                    tag: 'test-notification'
                });

                if (notification) {
                    this.showInfoToast('Test-Benachrichtigung gesendet');
                    console.log('Test notification sent successfully');
                } else {
                    this.showInfoToast('Test-Benachrichtigung fehlgeschlagen - prüfen Sie die Browser-Konsole');
                    console.warn('Test notification failed - check if notifications are enabled in settings');
                }
            } catch (e) {
                console.error('Error sending test notification:', e);
                this.showInfoToast('Fehler beim Senden der Test-Benachrichtigung');
            }
        },
        // Preset management methods
        refreshPresets() {
            try {
                this.presets = listEntityPresets();
                if (!this.selectedPreset && this.presets.length > 0) {
                    this.selectedPreset = this.presets[0].name;
                }
            } catch (e) {
                console.warn('Failed to load entity presets:', e);
                this.presets = [];
            }
        },
        togglePresetMenu() {
            this.showPresetMenu = !this.showPresetMenu;
            if (this.showPresetMenu) {
                this.refreshPresets();
            }
        },
        saveEntitiesPreset() {
            try {
                const name = (this.presetName || '').trim();
                if (!name) {
                    alert('Bitte geben Sie einen Namen für die Entitätenliste ein.');
                    return;
                }
                if (!Array.isArray(this.entities) || this.entities.length === 0) {
                    if (!confirm('Die Entitätenliste ist leer. Trotzdem speichern?')) {
                        return;
                    }
                }
                saveEntityPreset(name, this.entities, this.mode);
                this.refreshPresets();
                this.selectedPreset = name;
                alert('Entitätenliste gespeichert.');
            } catch (e) {
                console.error('Failed to save preset:', e);
                alert('Speichern der Entitätenliste fehlgeschlagen. Bitte versuchen Sie es erneut.');
            }
        },
        loadSelectedPreset() {
            try {
                const name = (this.selectedPreset || '').trim();
                if (!name) return;
                const preset = loadEntityPreset(name);
                if (!preset) {
                    alert('Ausgewählte Liste nicht gefunden.');
                    return;
                }
                // Apply mode from preset if available
                if (preset.mode) this.mode = preset.mode;
                // Replace current entities with preset entities
                const ents = Array.isArray(preset.entities) ? preset.entities : [];
                // Ensure objects have required shape
                this.entities = ents.map(e => ({ id: e.id, name: e.name, type: e.type, source: e.source }));
            } catch (e) {
                console.error('Failed to load preset:', e);
                alert('Laden der Entitätenliste fehlgeschlagen.');
            }
        },
        deleteSelectedPreset() {
            try {
                const name = (this.selectedPreset || '').trim();
                if (!name) return;
                if (!confirm(`Möchten Sie die Liste "${name}" wirklich löschen?`)) return;
                deleteEntityPreset(name);
                this.refreshPresets();
                this.selectedPreset = this.presets[0]?.name || '';
            } catch (e) {
                console.error('Failed to delete preset:', e);
                alert('Löschen fehlgeschlagen.');
            }
        },
        // Security Methods
        setupKeyboardRestrictions() {
            // Block Ctrl/Cmd+C in anonymize mode when restricted
            document.addEventListener('keydown', (e) => {
                // Check for Ctrl+C or Cmd+C
                if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                    if (this.mode === 'anonymize' && !this.canCopyOutput) {
                        // Only block if the user is trying to copy from the output area
                        const selection = window.getSelection();
                        if (selection && selection.toString()) {
                            e.preventDefault();
                            this.showInfoToast('Copying disabled in Restricted Mode');
                        }
                    }
                }
                // Check for Ctrl+V or Cmd+V
                if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                    if (this.mode === 'pseudonymize' && !this.canPasteInput) {
                        // Only block if focused on input textarea
                        const activeElement = document.activeElement;
                        if (activeElement && activeElement.tagName === 'TEXTAREA') {
                            e.preventDefault();
                            this.showInfoToast('Pasting disabled in Restricted Mode');
                        }
                    }
                }
            });

            // Block paste event on textarea in pseudonymize mode when restricted
            if (this.$refs.textArea) {
                this.$refs.textArea.addEventListener('paste', (e) => {
                    if (!this.canPasteInput) {
                        e.preventDefault();
                        this.showInfoToast('Pasting disabled in Restricted Mode');
                    }
                });
            }
        },
        async unlockMode() {
            if (!this.unlockPassword) {
                this.showInfoToast('Please enter a password');
                return;
            }

            const success = await securityManager.unlock(this.unlockPassword);

            if (success) {
                this.isUnrestricted = true;
                this.unlockPassword = '';
                this.showInfoToast('Unrestricted Mode activated');
            } else {
                this.showInfoToast('Invalid password');
                // Don't clear password on failure to allow retry
            }
        },
        lockMode() {
            securityManager.lock();
            this.isUnrestricted = false;
            this.showInfoToast('Restricted Mode activated');
        },
        getCopyButtonTitle() {
            if (this.scrollReview.enabled && !this.scrollReview.isFullyReviewed) {
                return `Scroll through entire text first (${this.scrollReview.progress}% completed)`;
            }
            if (!this.canCopyOutput) {
                return 'Copying disabled in Restricted Mode';
            }
            return 'Copy text to clipboard';
        },
        // Scroll Review Methods
        initScrollReview() {
            console.log('[ScrollReview] initScrollReview called', {
                isUnrestricted: this.isUnrestricted,
                mode: this.mode,
                shouldEnable: !this.isUnrestricted && this.mode === 'anonymize'
            });

            // Only enable in Restricted Mode + Anonymize Mode
            if (this.isUnrestricted || this.mode !== 'anonymize') {
                console.log('[ScrollReview] Disabled: unrestricted or not in anonymize mode');
                this.scrollReview.enabled = false;
                this.scrollReview.isFullyReviewed = false;
                return;
            }

            // Wait for next tick to ensure DOM is updated
            this.$nextTick(() => {
                const container = this.$refs.outputContainer;
                if (!container) {
                    console.error('[ScrollReview] outputContainer ref not found!');
                    this.scrollReview.enabled = false;
                    return;
                }

                const scrollHeight = container.scrollHeight;
                const clientHeight = container.clientHeight;
                console.log('[ScrollReview] Container dimensions:', { scrollHeight, clientHeight });

                // Edge Case: Content fits on one screen (no scrolling needed)
                if (scrollHeight <= clientHeight + 10) { // +10px tolerance
                    console.log('[ScrollReview] Content fits on one screen - auto-completing');
                    this.scrollReview.isFullyReviewed = true;
                    this.scrollReview.enabled = false;
                    this.scrollReview.progress = 100;
                    // Persist state
                    try {
                        localStorage.setItem('anon.currentScrollReviewCompleted', 'true');
                        localStorage.setItem('anon.currentScrollReviewRequired', 'false');
                    } catch (e) {}
                    this.notifyScrollReviewStatus();
                    return;
                }

                // Create zones
                const zoneHeight = this.scrollReview.zoneHeight;
                const totalZones = Math.ceil(scrollHeight / zoneHeight);

                this.scrollReview.zones = [];
                for (let i = 0; i < totalZones; i++) {
                    this.scrollReview.zones.push({
                        start: i * zoneHeight,
                        end: Math.min((i + 1) * zoneHeight, scrollHeight),
                        seen: false
                    });
                }

                // Mark first zone (currently in viewport) as seen
                this.scrollReview.zones[0].seen = true;

                this.scrollReview.totalZones = totalZones;
                this.scrollReview.seenZones = 1;
                this.scrollReview.enabled = true;
                this.scrollReview.isFullyReviewed = false;
                this.updateScrollReviewProgress();

                console.log('[ScrollReview] Enabled!', {
                    totalZones,
                    seenZones: 1,
                    progress: this.scrollReview.progress
                });

                // Persist state
                try {
                    localStorage.setItem('anon.currentScrollReviewRequired', 'true');
                    localStorage.setItem('anon.currentScrollReviewCompleted', 'false');
                } catch (e) {}
                this.notifyScrollReviewStatus();
            });
        },
        handleOutputScroll(event) {
            if (!this.scrollReview.enabled || this.scrollReview.isFullyReviewed) {
                return;
            }

            const container = event.target;
            const scrollTop = container.scrollTop;
            const clientHeight = container.clientHeight;

            // Viewport boundaries
            const visibleTop = scrollTop;
            const visibleBottom = scrollTop + clientHeight;

            // Mark all zones in viewport as seen
            let updated = false;
            this.scrollReview.zones.forEach(zone => {
                if (!zone.seen) {
                    // Zone is visible if it overlaps with viewport
                    const isVisible = (zone.end >= visibleTop) && (zone.start <= visibleBottom);
                    if (isVisible) {
                        zone.seen = true;
                        this.scrollReview.seenZones++;
                        updated = true;
                    }
                }
            });

            if (updated) {
                this.updateScrollReviewProgress();
            }
        },
        updateScrollReviewProgress() {
            const progress = (this.scrollReview.seenZones / this.scrollReview.totalZones) * 100;
            this.scrollReview.progress = Math.round(progress);

            if (progress >= 100) {
                this.scrollReview.isFullyReviewed = true;
                // Persist state
                try {
                    localStorage.setItem('anon.currentScrollReviewCompleted', 'true');
                } catch (e) {}
                this.notifyScrollReviewStatus();
                this.showInfoToast('✓ Text review completed. You can now copy or run prompts.');
            }
        },
        // Helper method to notify other components about scroll review status changes
        notifyScrollReviewStatus() {
            // Dispatch custom event for PromptLibraryModal to listen
            const event = new CustomEvent('scrollReviewStatusChanged', {
                detail: {
                    required: this.scrollReview.enabled,
                    completed: this.scrollReview.isFullyReviewed
                }
            });
            window.dispatchEvent(event);
        },
        // Synchronized Scrolling Methods
        setupSyncScroll() {
            this.$nextTick(() => {
                const inputArea = this.$refs.textArea;
                const outputContainer = this.$refs.outputContainer;

                if (!inputArea || !outputContainer) {
                    console.warn('[SyncScroll] Could not find refs for synchronized scrolling');
                    return;
                }

                console.log('[SyncScroll] Setting up scroll synchronization...');

                // Input area scrolls → Output container follows
                inputArea.addEventListener('scroll', () => {
                    if (this._isSyncScrolling) return;
                    this._isSyncScrolling = true;

                    const inputScrollable = inputArea.scrollHeight - inputArea.clientHeight;
                    if (inputScrollable > 0) {
                        const scrollPercentage = inputArea.scrollTop / inputScrollable;
                        const outputScrollable = outputContainer.scrollHeight - outputContainer.clientHeight;
                        if (outputScrollable > 0) {
                            outputContainer.scrollTop = scrollPercentage * outputScrollable;
                        }
                    }

                    setTimeout(() => {
                        this._isSyncScrolling = false;
                    }, 100);
                });

                // Output container scrolls → Input area follows
                // Note: This also handles scroll review tracking
                const originalOutputScroll = this.handleOutputScroll.bind(this);
                outputContainer.addEventListener('scroll', (event) => {
                    // First, handle scroll review tracking
                    originalOutputScroll(event);

                    // Then, sync scroll to input (only if not already syncing)
                    if (this._isSyncScrolling) return;
                    this._isSyncScrolling = true;

                    const outputScrollable = outputContainer.scrollHeight - outputContainer.clientHeight;
                    if (outputScrollable > 0) {
                        const scrollPercentage = outputContainer.scrollTop / outputScrollable;
                        const inputScrollable = inputArea.scrollHeight - inputArea.clientHeight;
                        if (inputScrollable > 0) {
                            inputArea.scrollTop = scrollPercentage * inputScrollable;
                        }
                    }

                    setTimeout(() => {
                        this._isSyncScrolling = false;
                    }, 100);
                });

                console.log('[SyncScroll] Synchronized scrolling enabled');
            });
        }
    },
    watch: {
        value(newValue) {
            this.text = newValue;
        },
        anonymizedTextPlain() {
            this.persistCurrentOutput();
            // NOTE: We DON'T reset scroll review here when output changes
            // (e.g., when user adds/removes entities during review).
            // Review state persists as requested.
        },
        mode(newMode) {
            this.persistCurrentOutput();
            // Enable/disable scroll review based on mode
            if (newMode === 'anonymize') {
                this.$nextTick(() => this.initScrollReview());
            } else {
                this.scrollReview.enabled = false;
                this.scrollReview.isFullyReviewed = false;
                this.notifyScrollReviewStatus();
            }
        },
        isUnrestricted(val) {
            // When unlocking, disable scroll review
            if (val) {
                this.scrollReview.enabled = false;
                this.scrollReview.isFullyReviewed = false;
                this.notifyScrollReviewStatus();
            } else {
                // When locking, re-initialize scroll review if in anonymize mode
                if (this.mode === 'anonymize') {
                    this.$nextTick(() => this.initScrollReview());
                }
            }
        },
        entities: {
            handler() {
                // Reset cycling indices when entities list changes
                this._entityOccurrenceIndex = {};
                this.persistCurrentOutput();
            },
            deep: false
        },
        // Reload prompts when Prompt Library is closed (in case new prompts were added)
        showPromptLibrary(newVal, oldVal) {
            if (oldVal === true && newVal === false) {
                // Prompt Library was just closed, reload prompts
                this.loadPrompts();
            }
        },
        // Reload text blocks when Text Block Library is closed
        showTextBlockLibrary(newVal, oldVal) {
            if (oldVal === true && newVal === false) {
                // Text Block Library was just closed, reload text blocks and selections
                this.loadTextBlocks().then(() => {
                    this.loadCachedTextBlockSelections();
                });
            }
        }
    },
    components: {
        ArrowPathIcon,
        ArrowUpTrayIcon,
        ArrowDownIcon,
        ArrowUpIcon,
        Cog6ToothIcon,
        ExclamationTriangleIcon,
        StarIcon,
        XMarkIcon,
        SigmaIcon,
        ListBulletIcon,
        FolderIcon,
        DocumentPlusIcon,
        PromptLibraryModal,
        TextBlockLibraryModal,
        CaseManagementModal
    },
}
</script>