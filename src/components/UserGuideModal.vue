<template>
  <div class="modal modal-open">
    <div class="modal-box w-11/12 max-w-6xl h-[90vh] flex flex-col">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-2xl">📖 Benutzeranleitung</h3>
        <button @click="$emit('close')" class="btn btn-sm btn-circle btn-ghost">
          ✕
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs tabs-boxed mb-4">
        <a
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['tab', activeTab === tab.id ? 'tab-active' : '']"
        >
          {{ tab.icon }} {{ tab.name }}
        </a>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto prose prose-sm max-w-none">

        <!-- Einführung -->
        <div v-show="activeTab === 'intro'">
          <h2>Einführung</h2>
          <p>
            Diese Webanwendung ermöglicht die <strong>lokale, KI-gestützte Anonymisierung</strong> und
            <strong>De-Anonymisierung</strong> von sensiblen Texten. Alle Daten werden ausschließlich im Browser
            verarbeitet - es erfolgt <strong>keine Übertragung an externe Server</strong> (außer bei optionaler
            Nutzung der Google Gemini API).
          </p>

          <h3>Unterstützte Entitätstypen</h3>
          <ul>
            <li>👤 <strong>PERSON</strong> - Namen von Personen</li>
            <li>📍 <strong>LOCATION</strong> - Orte, Adressen, Städte</li>
            <li>🏢 <strong>ORGANIZATION</strong> - Firmen, Behörden, Institutionen</li>
            <li>📅 <strong>DATE</strong> - Datumsangaben</li>
            <li>⏰ <strong>TIME</strong> - Zeitangaben</li>
            <li>🚗 <strong>LICENSE_PLATE</strong> - Kennzeichen</li>
            <li>🚙 <strong>CAR</strong> - Fahrzeugbezeichnungen</li>
            <li>🔧 <strong>OTHER</strong> - Sonstige sensible Informationen</li>
          </ul>

          <div class="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span><strong>Wichtig:</strong> Die KI erreicht eine Genauigkeit von ca. 90-95%. Prüfen Sie erkannte Entitäten immer manuell!</span>
          </div>
        </div>

        <!-- Restricted Mode -->
        <div v-show="activeTab === 'restricted'">
          <h2>🔒 Funktionen im Restricted Mode</h2>
          <p>
            Der <strong>Restricted Mode</strong> ist standardmäßig <strong>aktiviert</strong> und dient dem Schutz
            vor versehentlichem Kopieren nicht vollständig geprüfter Texte. Er stellt sicher, dass Benutzer
            anonymisierte Texte vollständig durchgesehen haben, bevor sie diese verwenden können.
          </p>

          <h3>Was ist im Restricted Mode eingeschränkt?</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="card-title text-base">Im Anonymisierungs-Modus:</h4>
                <ul class="list-disc list-inside space-y-1 text-sm">
                  <li>❌ <strong>Kopieren blockiert</strong> bis Text vollständig durchgescrollt</li>
                  <li>❌ <strong>Quick Infer blockiert</strong> bis Text vollständig geprüft</li>
                  <li>✅ <strong>Einfügen erlaubt</strong> (manuell)</li>
                  <li>✅ <strong>Datei-Upload erlaubt</strong> (TXT, PDF, DOCX)</li>
                </ul>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="card-title text-base">Im De-Anonymisierungs-Modus:</h4>
                <ul class="list-disc list-inside space-y-1 text-sm">
                  <li>✅ <strong>Kopieren erlaubt</strong> (jederzeit)</li>
                  <li>❌ <strong>Einfügen blockiert</strong> (Sicherheitsgründe)</li>
                  <li>✅ <strong>Datei-Upload erlaubt</strong></li>
                </ul>
              </div>
            </div>
          </div>

          <h3 class="mt-6">🔓 Restricted Mode entsperren</h3>
          <ol class="list-decimal list-inside space-y-2">
            <li>Klicken Sie auf das <strong>Zahnrad-Symbol</strong> (⚙️) oben rechts</li>
            <li>Wählen Sie <strong>"Einstellungen konfigurieren"</strong></li>
            <li>Geben Sie das <strong>Master-Passwort</strong> ein</li>
            <li>Der Restricted Mode wird für die aktuelle Sitzung deaktiviert</li>
            <li>Nach dem Schließen des Browsers wird der Restricted Mode automatisch wieder aktiviert</li>
          </ol>

          <div class="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Wenn das Master-Passwort geändert wird, werden alle aktiven Sitzungen automatisch auf Restricted Mode zurückgesetzt.</span>
          </div>

          <h3 class="mt-6">📊 Scroll-Review-System</h3>
          <p>Das Scroll-Review-System stellt sicher, dass Sie den gesamten anonymisierten Text geprüft haben:</p>
          <ol class="list-decimal list-inside space-y-2">
            <li>Der <strong>Output-Bereich</strong> wird in mehrere Zonen unterteilt</li>
            <li>Eine <strong>Fortschrittsanzeige</strong> unter dem Output-Bereich zeigt Ihren Prüffortschritt</li>
            <li>Sie müssen <strong>100% des Textes durchscrollen</strong>, um den "Kopieren"-Button freizuschalten</li>
            <li>Der Fortschritt wird in Echtzeit aktualisiert</li>
            <li>Das Symbol 🔒 verschwindet vom Button, sobald der Text vollständig geprüft wurde</li>
          </ol>
        </div>

        <!-- Anonymisierung -->
        <div v-show="activeTab === 'anonymize'">
          <h2>🔐 Anonymisierungs-Modus</h2>

          <h3>1. Text eingeben</h3>
          <div class="space-y-4">
            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="font-semibold">Methode 1: Manuelles Eingeben/Einfügen</h4>
                <ol class="list-decimal list-inside space-y-1 text-sm">
                  <li>Wechseln Sie in den <strong>"Anonymisieren"</strong>-Modus (linke Seitenleiste)</li>
                  <li>Geben Sie Ihren Text in das <strong>linke Textfeld</strong> ein oder fügen Sie ihn ein (Ctrl+V)</li>
                  <li>Der Text kann beliebig lang sein (empfohlen: max. 100.000 Zeichen)</li>
                </ol>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="font-semibold">Methode 2: Datei hochladen</h4>
                <ol class="list-decimal list-inside space-y-1 text-sm">
                  <li>Klicken Sie auf das <strong>📎 Datei-Symbol</strong> über dem Eingabefeld</li>
                  <li>Wählen Sie eine TXT, PDF oder DOCX-Datei aus</li>
                  <li>Der Text wird automatisch extrahiert und angezeigt</li>
                </ol>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="font-semibold">Methode 3: Drag & Drop</h4>
                <ol class="list-decimal list-inside space-y-1 text-sm">
                  <li>Ziehen Sie eine Datei direkt in das <strong>Eingabefeld</strong></li>
                  <li>Der Text wird automatisch extrahiert</li>
                </ol>
              </div>
            </div>
          </div>

          <h3 class="mt-6">2. Entitäten erkennen</h3>
          <ol class="list-decimal list-inside space-y-2">
            <li>Klicken Sie auf <strong>"Anonymisierung starten"</strong> (grüner Button in der linken Seitenleiste)</li>
            <li>Die KI analysiert den Text und erkennt sensible Entitäten</li>
            <li><strong>Beim ersten Mal:</strong> Die KI-Modelle (~1 GB) werden heruntergeladen
              <ul class="list-disc list-inside ml-6 mt-1">
                <li>Ein Fortschrittsbalken zeigt den Download-Status</li>
                <li>Dies geschieht nur einmal, danach sind die Modelle lokal verfügbar</li>
              </ul>
            </li>
            <li>Nach der Analyse erscheinen die erkannten Entitäten in der <strong>Liste links</strong></li>
          </ol>

          <h3 class="mt-6">3. Entitäten bearbeiten</h3>

          <h4 class="font-semibold mt-4">Erkannte Entitäten anpassen:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Jede erkannte Entität wird in der linken Seitenleiste aufgelistet</li>
            <li>Klicken Sie auf den <strong>"Bearbeiten"-Button</strong> (✏️) neben einer Entität</li>
            <li>Sie können:
              <ul class="list-disc list-inside ml-6">
                <li>Den <strong>Typ</strong> ändern (z.B. von PERSON zu ORGANIZATION)</li>
                <li>Den <strong>Ersetzungstext</strong> (Platzhalter) anpassen</li>
                <li>Die Entität <strong>löschen</strong> (🗑️-Symbol)</li>
              </ul>
            </li>
          </ol>

          <h4 class="font-semibold mt-4">Manuelle Entität hinzufügen:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Scrollen Sie in der linken Seitenleiste nach unten zum Formular <strong>"Entität hinzufügen"</strong></li>
            <li>Geben Sie den <strong>Originaltext</strong> ein (z.B. "Geheimprojekt Alpha")</li>
            <li>Wählen Sie den <strong>Entitätstyp</strong> aus dem Dropdown</li>
            <li>Optional: Passen Sie den <strong>Platzhalter</strong> an (z.B. "[PROJEKT_1]")</li>
            <li>Klicken Sie auf <strong>"Hinzufügen"</strong></li>
          </ol>

          <h4 class="font-semibold mt-4">Regex-Pattern verwenden:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Aktivieren Sie die Checkbox <strong>"Regex Pattern"</strong> im Formular</li>
            <li>Geben Sie ein reguläres Ausdrucksmuster ein (z.B. <code>\d{3}-\d{4}</code> für Telefonnummern)</li>
            <li>Alle Übereinstimmungen werden automatisch als Entitäten erfasst</li>
          </ol>

          <div class="alert alert-success mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><strong>Tipp:</strong> Verwenden Sie aussagekräftige Platzhalter wie "[KLIENT]" statt "[PERSON_1]" für bessere Lesbarkeit!</span>
          </div>

          <h3 class="mt-6">4. Anonymisierten Text verwenden</h3>
          <ol class="list-decimal list-inside space-y-2">
            <li>Der anonymisierte Text wird im <strong>rechten Bereich</strong> angezeigt</li>
            <li>Im <strong>Restricted Mode</strong>: Scrollen Sie durch den gesamten Text (100%)</li>
            <li>Der <strong>"Kopieren"-Button</strong> wird freigeschaltet</li>
            <li>Klicken Sie auf <strong>"Kopieren"</strong>, um den Text in die Zwischenablage zu kopieren</li>
            <li>Der Text ist nun bereit zur Verwendung in anderen Anwendungen</li>
          </ol>
        </div>

        <!-- De-Anonymisierung -->
        <div v-show="activeTab === 'deanonymize'">
          <h2>🔓 De-Anonymisierungs-Modus</h2>

          <h3>1. Anonymisierten Text de-anonymisieren</h3>
          <ol class="list-decimal list-inside space-y-2">
            <li>Wechseln Sie in den <strong>"De-Anonymisieren"</strong>-Modus (lila Button in der linken Seitenleiste)</li>
            <li>Laden Sie Ihren <strong>Case</strong> aus dem Case Management (wenn gespeichert)</li>
            <li><strong>Oder</strong> laden Sie eine zuvor gespeicherte Entitätsliste:
              <ul class="list-disc list-inside ml-6">
                <li>Klicken Sie auf <strong>"Entitäten laden"</strong></li>
                <li>Wählen Sie die JSON-Datei mit den Entitäten aus</li>
              </ul>
            </li>
            <li>Geben Sie den anonymisierten Text ein:
              <ul class="list-disc list-inside ml-6">
                <li><strong>Methode 1:</strong> Datei hochladen (📎-Symbol)</li>
                <li><strong>Methode 2:</strong> Drag & Drop</li>
                <li><strong>Methode 3:</strong> Text einfügen (nur im Unrestricted Mode)</li>
              </ul>
            </li>
            <li>Der de-anonymisierte Text erscheint automatisch im <strong>rechten Bereich</strong></li>
            <li>Alle Platzhalter (z.B. "[PERSON_1]") werden durch die Originalwerte ersetzt</li>
          </ol>

          <h3 class="mt-6">2. Partielle De-Anonymisierung</h3>
          <p>Sie können auswählen, <strong>welche Entitäten</strong> de-anonymisiert werden sollen:</p>
          <ol class="list-decimal list-inside space-y-2">
            <li>In der linken Seitenleiste sehen Sie alle verfügbaren Entitäten</li>
            <li>Deaktivieren Sie die <strong>Checkboxen</strong> bei Entitäten, die <strong>nicht</strong> de-anonymisiert werden sollen</li>
            <li>Der Output wird in Echtzeit aktualisiert</li>
            <li>Nur aktivierte Entitäten werden ersetzt</li>
          </ol>

          <div class="card bg-base-200 mt-4">
            <div class="card-body">
              <h4 class="font-semibold">💡 Anwendungsfall:</h4>
              <p class="text-sm">
                Sie möchten Personennamen weiterhin anonymisiert lassen, aber Datumsangaben wiederherstellen?
                Einfach nur die DATE-Entitäten aktivieren, alle PERSON-Entitäten deaktivieren!
              </p>
            </div>
          </div>

          <h3 class="mt-6">3. De-Anonymisierungs-Historie</h3>
          <p>Die letzten <strong>3 De-Anonymisierungen</strong> werden automatisch gespeichert:</p>
          <ol class="list-decimal list-inside space-y-2">
            <li>Unter dem Output-Bereich finden Sie die <strong>"Pseudonymize History"</strong></li>
            <li>Klicken Sie auf einen Eintrag, um eine frühere De-Anonymisierung zu laden</li>
            <li>Die entsprechenden Eingaben und Entitäten werden wiederhergestellt</li>
            <li>Sie können zwischen den Einträgen wechseln</li>
          </ol>
        </div>

        <!-- Quick Infer -->
        <div v-show="activeTab === 'infer'">
          <h2>🤖 Quick Infer - KI-gestützte Textverarbeitung</h2>

          <div class="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span><strong>Voraussetzung:</strong> Google Gemini API-Schlüssel erforderlich</span>
          </div>

          <h3>1. API-Schlüssel konfigurieren</h3>
          <ol class="list-decimal list-inside space-y-2">
            <li>Klicken Sie auf das <strong>Zahnrad-Symbol</strong> (⚙️) oben rechts</li>
            <li>Wählen Sie <strong>"Einstellungen konfigurieren"</strong></li>
            <li>Geben Sie Ihren <strong>Google Gemini API-Schlüssel</strong> ein</li>
            <li>Klicken Sie auf <strong>"Speichern"</strong></li>
            <li>Die Prompt Library und Quick Infer Funktionen werden aktiviert</li>
          </ol>

          <div class="card bg-base-200 mt-4">
            <div class="card-body">
              <h4 class="font-semibold">API-Schlüssel erhalten:</h4>
              <ul class="list-disc list-inside text-sm">
                <li>Besuchen Sie <a href="https://ai.google.dev/" target="_blank" class="link">https://ai.google.dev/</a></li>
                <li>Erstellen Sie ein Projekt</li>
                <li>Generieren Sie einen API-Schlüssel für Gemini</li>
              </ul>
            </div>
          </div>

          <h3 class="mt-6">2. Quick Infer verwenden</h3>
          <p>Quick Infer ermöglicht <strong>schnelle KI-Inferenzen</strong> direkt aus dem Output-Bereich:</p>
          <ol class="list-decimal list-inside space-y-2">
            <li>Im <strong>Anonymisierungs-Modus</strong>: Stellen Sie sicher, dass der Text vollständig geprüft wurde (Restricted Mode)</li>
            <li>Klicken Sie auf <strong>"Quick Infer"</strong> unter dem Output-Bereich</li>
            <li>Das <strong>Prompt-Auswahl-Modal</strong> öffnet sich</li>
            <li>Wählen Sie einen <strong>vordefinierten Prompt</strong> aus der Dropdown-Liste</li>
            <li><strong>Optional:</strong> Wählen Sie Kontext aus:
              <ul class="list-disc list-inside ml-6">
                <li>Checkbox "Include entire text": Der gesamte Output wird als Kontext verwendet</li>
                <li><strong>Oder:</strong> Markieren Sie Text im Output-Bereich vor dem Klick auf Quick Infer</li>
              </ul>
            </li>
            <li>Klicken Sie auf <strong>"Inferenz starten"</strong></li>
            <li>Die KI-Antwort erscheint in einem <strong>Popup-Fenster</strong></li>
          </ol>

          <h3 class="mt-6">3. Beispiel-Anwendungsfälle</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="badge badge-lg badge-outline">Zusammenfassung</div>
            <div class="badge badge-lg badge-outline">Rechtliche Analyse</div>
            <div class="badge badge-lg badge-outline">Übersetzung</div>
            <div class="badge badge-lg badge-outline">Sentiment-Analyse</div>
            <div class="badge badge-lg badge-outline">Schlüsselbegriff-Extraktion</div>
            <div class="badge badge-lg badge-outline">Strukturierung</div>
          </div>

          <h3 class="mt-6">4. Kontext-Auswahl</h3>
          <p>Sie haben drei Möglichkeiten, Kontext für Quick Infer bereitzustellen:</p>

          <div class="space-y-3 mt-3">
            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">1. Gesamter Text</h4>
                <p class="text-xs">Aktivieren Sie "Include entire text" im Modal. Der komplette Output wird verwendet.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">2. Textauswahl</h4>
                <p class="text-xs">Markieren Sie Text im Output-Bereich <strong>vor</strong> dem Klick auf Quick Infer. Nur die Auswahl wird verwendet.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">3. Kein Kontext</h4>
                <p class="text-xs">Weder Text markieren noch "Include entire text" aktivieren. Nur der Prompt wird verwendet.</p>
              </div>
            </div>
          </div>

          <h3 class="mt-6">5. Full Prompt Preview</h3>
          <p>Bevor Sie die Inferenz starten, können Sie den vollständigen Prompt einsehen:</p>
          <ol class="list-decimal list-inside space-y-1">
            <li>Im Prompt-Auswahl-Modal wählen Sie einen Prompt aus</li>
            <li>Klicken Sie auf <strong>"Preview Full Prompt"</strong></li>
            <li>Ein Modal zeigt den kompletten Prompt inklusive aller eingefügten Textbausteine</li>
            <li>Sie können den Prompt in die Zwischenablage kopieren ("Copy Full Prompt")</li>
            <li>Schließen Sie die Vorschau oder starten Sie die Inferenz direkt</li>
          </ol>
        </div>

        <!-- Erweiterte Funktionen -->
        <div v-show="activeTab === 'advanced'">
          <h2>⚙️ Erweiterte Funktionen</h2>

          <h3>Case Management - Projektverwaltung</h3>
          <p>Das Case Management ermöglicht die Organisation von Anonymisierungsprojekten in wiederverwendbaren Cases.</p>

          <h4 class="font-semibold mt-4">Neuen Case erstellen:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Klicken Sie auf das <strong>Ordner-Symbol</strong> (📁) oben rechts</li>
            <li>Klicken Sie auf <strong>"Neuer Case"</strong></li>
            <li>Geben Sie einen <strong>Case-Namen</strong> ein (z.B. "Vertrag Müller AG 2024")</li>
            <li>Optional: Geben Sie eine Beschreibung ein</li>
            <li>Der neue Case wird aktiv und automatisch gespeichert</li>
          </ol>

          <h4 class="font-semibold mt-4">Case laden/verwalten:</h4>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Laden:</strong> Klicken Sie auf einen Case-Namen in der Liste</li>
            <li><strong>Löschen:</strong> Klicken Sie auf den 🗑️-Button (kann nicht rückgängig gemacht werden!)</li>
            <li><strong>Exportieren:</strong> Klicken Sie auf den 💾-Button (JSON-Datei)</li>
            <li><strong>Importieren:</strong> Klicken Sie auf "Case importieren" und wählen Sie eine JSON-Datei</li>
          </ul>

          <div class="divider"></div>

          <h3>Prompt Library</h3>
          <p>Verwalten Sie wiederverwendbare KI-Prompts mit dynamischen Textbausteinen.</p>

          <h4 class="font-semibold mt-4">Neuen Prompt erstellen:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Klicken Sie auf das <strong>Listen-Symbol</strong> (☰) oben rechts</li>
            <li>Klicken Sie auf <strong>"Neuer Prompt"</strong></li>
            <li>Geben Sie einen Namen und Prompt-Text ein</li>
            <li>Optional: Fügen Sie Textbausteine ein mit <code>{{'{{'}}textblock:ID{{'}}'}}</code></li>
            <li>Optional: Verwenden Sie <code>{{'{{'}}anontext{{'}}'}}</code> als Platzhalter für den Output-Text</li>
            <li>Klicken Sie auf <strong>"Speichern"</strong></li>
          </ol>

          <div class="divider"></div>

          <h3>Textbaustein Library</h3>
          <p>Verwalten Sie wiederverwendbare Textblöcke, die in Prompts eingefügt werden können.</p>

          <h4 class="font-semibold mt-4">Neuen Textbaustein erstellen:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Klicken Sie auf das <strong>§-Symbol</strong> oben rechts</li>
            <li>Klicken Sie auf <strong>"Neuer Textbaustein"</strong></li>
            <li>Geben Sie einen Namen und Textinhalt ein</li>
            <li>Klicken Sie auf <strong>"Speichern"</strong></li>
            <li>Der Textbaustein erhält automatisch eine eindeutige ID</li>
          </ol>

          <div class="divider"></div>

          <h3>Browser-Benachrichtigungen</h3>
          <p>Die Anwendung kann Desktop-Benachrichtigungen senden, um Sie über lange Vorgänge zu informieren.</p>

          <h4 class="font-semibold mt-4">Benachrichtigungen aktivieren:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Öffnen Sie <strong>Einstellungen</strong> (⚙️-Symbol)</li>
            <li>Aktivieren Sie <strong>"Browser-Benachrichtigungen aktivieren"</strong></li>
            <li>Ihr Browser fragt nach Erlaubnis für Benachrichtigungen</li>
            <li>Klicken Sie auf <strong>"Erlauben"</strong></li>
          </ol>

          <p class="mt-3"><strong>Wann werden Benachrichtigungen gesendet?</strong></p>
          <ul class="list-disc list-inside space-y-1">
            <li>✅ Entitätserkennung abgeschlossen (wenn länger als 3 Sekunden)</li>
            <li>✅ Datei-Verarbeitung abgeschlossen</li>
            <li>✅ KI-Inferenz abgeschlossen (Quick Infer)</li>
            <li>✅ Modell-Download abgeschlossen</li>
          </ul>

          <div class="divider"></div>

          <h3>Regex-basierte Entitätserkennung</h3>
          <p>Für spezielle Muster (z.B. Telefonnummern, Kundennummern), die die KI nicht automatisch erkennt:</p>

          <div class="card bg-base-200 mt-3">
            <div class="card-body">
              <h4 class="font-semibold">Beispiele für Regex-Patterns:</h4>
              <ul class="list-disc list-inside text-sm space-y-1">
                <li><strong>Telefonnummern:</strong> <code>\+?[0-9]{{'{'}}{1,4}}[\s\-]?[0-9]{{'{'}}{3,4}}[\s\-]?[0-9]{{'{'}}{4,}}</code></li>
                <li><strong>E-Mail:</strong> <code>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{{'{'}}{2,}}</code></li>
                <li><strong>Kundennummern:</strong> <code>KD-\d{{'{'}}{6}}</code></li>
                <li><strong>IBANs:</strong> <code>[A-Z]{{'{'}}{2}}\d{{'{'}}{2}}[\s]?\d{{'{'}}{4}}[\s]?\d{{'{'}}{4}}[\s]?\d{{'{'}}{4}}[\s]?\d{{'{'}}{4}}</code></li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Tipps -->
        <div v-show="activeTab === 'tips'">
          <h2>💡 Tipps und Best Practices</h2>

          <h3>✅ Anonymisierung</h3>
          <div class="space-y-3">
            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Prüfen Sie die erkannten Entitäten sorgfältig</h4>
                <p class="text-xs">Die KI kann Fehler machen. Überprüfen Sie besonders Namen, Orte und Organisationen. Fügen Sie fehlende Entitäten manuell hinzu.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Verwenden Sie aussagekräftige Platzhalter</h4>
                <p class="text-xs">Statt "[PERSON_1]" besser "[KLIENT]" oder "[KLÄGER]". Erleichtert spätere De-Anonymisierung und macht den Text lesbarer.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Speichern Sie Ihre Cases</h4>
                <p class="text-xs">Erstellen Sie für jedes Projekt einen eigenen Case. Exportieren Sie wichtige Cases als Backup. Verwenden Sie beschreibende Namen.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Nutzen Sie Regex für spezielle Muster</h4>
                <p class="text-xs">Telefonnummern, E-Mails, Kundennummern - einmal definiert, immer wiederverwendbar. Spart Zeit bei wiederkehrenden Mustern.</p>
              </div>
            </div>
          </div>

          <h3 class="mt-6">✅ Sicherheit</h3>
          <div class="space-y-3">
            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Restricted Mode nutzen</h4>
                <p class="text-xs">Aktivieren Sie ihn für normale Arbeit. Entsperren Sie nur bei Bedarf. Schützt vor versehentlichen Fehlern.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Backups erstellen</h4>
                <p class="text-xs">Exportieren Sie wichtige Cases. Speichern Sie Backups außerhalb des Browsers. Testen Sie Wiederherstellung.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">API-Schlüssel sichern</h4>
                <p class="text-xs">Nutzen Sie nur vertrauenswürdige Geräte. Löschen Sie den Schlüssel nach Nutzung. Überwachen Sie API-Nutzung in der Google Cloud Console.</p>
              </div>
            </div>
          </div>

          <h3 class="mt-6">✅ Performance</h3>
          <div class="space-y-3">
            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Erste Nutzung</h4>
                <p class="text-xs">Planen Sie 1-2 Minuten für Modell-Download ein. Stabile Internetverbindung erforderlich. Nur einmal nötig.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Große Texte</h4>
                <p class="text-xs">Teilen Sie sehr lange Texte (>100.000 Zeichen) auf. Nutzen Sie Case Management für Struktur. Vermeiden Sie unnötige Neuberechnungen.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Browser-Empfehlungen</h4>
                <p class="text-xs">Chrome oder Edge für beste Performance. Mindestens 4 GB RAM. Modernes Betriebssystem (Windows 10+, macOS 10.15+, Linux).</p>
              </div>
            </div>
          </div>

          <h3 class="mt-6">✅ Datenschutz</h3>
          <div class="space-y-3">
            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Lokale Verarbeitung bevorzugen</h4>
                <p class="text-xs">Nutzen Sie Quick Infer nur wenn nötig. Anonymisierung funktioniert komplett offline. Keine Datenübertragung an Server.</p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">Sensitive Daten schützen</h4>
                <p class="text-xs">Löschen Sie Cases nach Projektabschluss. Leeren Sie Browser-Daten bei gemeinsam genutzten Geräten. Verwenden Sie private Browser-Fenster für extra Schutz.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- FAQ -->
        <div v-show="activeTab === 'faq'">
          <h2>❓ Häufig gestellte Fragen (FAQ)</h2>

          <div class="space-y-4">
            <div class="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div class="collapse-title font-semibold">
                Werden meine Daten auf einen Server hochgeladen?
              </div>
              <div class="collapse-content">
                <p><strong>Nein.</strong> Alle Daten werden ausschließlich lokal im Browser verarbeitet. <strong>Ausnahme:</strong> Wenn Sie die Google Gemini API für Quick Infer verwenden, werden Prompts und ausgewählter Kontext an Google gesendet.</p>
              </div>
            </div>

            <div class="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div class="collapse-title font-semibold">
                Kann ich die Anwendung offline nutzen?
              </div>
              <div class="collapse-content">
                <p><strong>Ja.</strong> Nach dem ersten Download der KI-Modelle funktioniert die Anonymisierung und De-Anonymisierung komplett offline. Nur Quick Infer benötigt Internetverbindung (Google Gemini API).</p>
              </div>
            </div>

            <div class="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div class="collapse-title font-semibold">
                Wie genau ist die KI-Erkennung?
              </div>
              <div class="collapse-content">
                <p>Die KI (GLiNER) erreicht eine <strong>Genauigkeit von ca. 90-95%</strong> bei gängigen Entitäten wie Personennamen und Orten. Sie sollten jedoch <strong>immer manuell nachprüfen</strong> und fehlende Entitäten ergänzen.</p>
              </div>
            </div>

            <div class="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div class="collapse-title font-semibold">
                Was passiert beim Löschen des Browser-Cache?
              </div>
              <div class="collapse-content">
                <ul class="list-disc list-inside space-y-1">
                  <li><strong>IndexedDB und localStorage:</strong> Bleiben erhalten</li>
                  <li><strong>Browser-Cache:</strong> KI-Modelle werden gelöscht und müssen neu heruntergeladen werden</li>
                  <li><strong>Cases und Einstellungen:</strong> Bleiben erhalten</li>
                </ul>
              </div>
            </div>

            <div class="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div class="collapse-title font-semibold">
                Kann ich die Anwendung auf mehreren Geräten nutzen?
              </div>
              <div class="collapse-content">
                <p>Ja, aber die Daten sind <strong>nicht synchronisiert</strong>. Jedes Gerät hat seine eigenen lokalen Daten. Nutzen Sie die <strong>Export/Import-Funktionen</strong> für Cases, um Daten zwischen Geräten zu übertragen.</p>
              </div>
            </div>

            <div class="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div class="collapse-title font-semibold">
                Gibt es ein Limit für die Textlänge?
              </div>
              <div class="collapse-content">
                <ul class="list-disc list-inside space-y-1">
                  <li><strong>Praktisches Limit:</strong> ~100.000 Zeichen für optimale Performance</li>
                  <li><strong>Technisches Limit:</strong> Abhängig von Ihrem Browser-Speicher</li>
                  <li><strong>Empfehlung:</strong> Teilen Sie sehr lange Texte auf mehrere Cases auf</li>
                </ul>
              </div>
            </div>

            <div class="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div class="collapse-title font-semibold">
                Unterstützt die Anwendung mehrere Sprachen?
              </div>
              <div class="collapse-content">
                <p>Die KI-Erkennung funktioniert am besten mit <strong>deutschen und englischen</strong> Texten. Andere Sprachen können schlechtere Ergebnisse liefern. Die Benutzeroberfläche ist aktuell nur auf <strong>Deutsch</strong> verfügbar.</p>
              </div>
            </div>

            <div class="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div class="collapse-title font-semibold">
                Was bedeutet "GLiNER" und "ONNX"?
              </div>
              <div class="collapse-content">
                <ul class="list-disc list-inside space-y-1">
                  <li><strong>GLiNER:</strong> "Generalist and Lightweight Named Entity Recognition" - das KI-Modell zur Entitätserkennung</li>
                  <li><strong>ONNX:</strong> "Open Neural Network Exchange" - das Format, in dem das Modell ausgeführt wird (ermöglicht Ausführung im Browser)</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="alert alert-info mt-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 class="font-semibold">Support und Weitere Informationen</h4>
              <p class="text-sm mt-1">
                <strong>Entwickelt von:</strong> Basierend auf der Arbeit von
                <a href="https://www.recht-intelligent.ch" class="link" target="_blank">recht.intelligent</a> /
                <a href="https://iusable.ai" class="link" target="_blank">iusable.ai</a>
              </p>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer with Close Button -->
      <div class="modal-action">
        <button @click="$emit('close')" class="btn btn-primary">Schließen</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const activeTab = ref('intro');

const tabs = [
  { id: 'intro', name: 'Einführung', icon: '📖' },
  { id: 'restricted', name: 'Restricted Mode', icon: '🔒' },
  { id: 'anonymize', name: 'Anonymisierung', icon: '🔐' },
  { id: 'deanonymize', name: 'De-Anonymisierung', icon: '🔓' },
  { id: 'infer', name: 'Quick Infer', icon: '🤖' },
  { id: 'advanced', name: 'Erweitert', icon: '⚙️' },
  { id: 'tips', name: 'Tipps', icon: '💡' },
  { id: 'faq', name: 'FAQ', icon: '❓' }
];

defineEmits(['close']);
</script>

<style scoped>
.prose {
  max-width: none;
}

.prose h2 {
  @apply text-xl font-bold mt-6 mb-3 border-b border-base-300 pb-2;
}

.prose h3 {
  @apply text-lg font-semibold mt-4 mb-2;
}

.prose h4 {
  @apply text-base font-semibold mt-3 mb-1;
}

.prose p {
  @apply mb-3;
}

.prose ul, .prose ol {
  @apply mb-3;
}

.prose code {
  @apply bg-base-200 px-1 py-0.5 rounded text-sm;
}

.prose a {
  @apply link link-primary;
}
</style>
