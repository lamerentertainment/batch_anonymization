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
            Diese Webanwendung bietet als <strong>Hauptfunktionalität die lokale, KI-gestützte Anonymisierung</strong> und
            <strong>De-Anonymisierung</strong> von sensiblen Texten. Sie ermöglicht die datenschutzkonforme Verarbeitung
            anonymisierter Texte mit kommerziellen KI-Providern unter Einhaltung der <strong>DSGVO, des Amts- und
            Berufsgeheimnisses</strong>.
          </p>

          <h3>Zwei zentrale Funktionsbereiche</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="card-title text-base">🔒 Lokale Offline-Verarbeitung</h4>
                <ul class="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Anonymisierung & De-Anonymisierung</strong> - komplett im Browser</li>
                  <li><strong>Fallmanagement</strong> - konsistente Entitätsverwaltung über mehrere Dokumente</li>
                  <li>Keine Datenübertragung an externe Server</li>
                  <li>KI-Modelle werden einmalig heruntergeladen und lokal ausgeführt</li>
                </ul>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body">
                <h4 class="card-title text-base">🌐 Online KI-Inferenz</h4>
                <ul class="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Prompt Library</strong> - wiederverwendbare Aufgabenstellungen</li>
                  <li><strong>Textbausteinbibliothek</strong> - Gesetzestexte, Prompts als Vorlagen</li>
                  <li>Verarbeitung der <strong>anonymisierten</strong> Texte mit Google Gemini API</li>
                  <li>DSGVO-konforme Nutzung durch vorherige Anonymisierung</li>
                </ul>
              </div>
            </div>
          </div>

          <h3 class="mt-6">Unterstützte Entitätstypen</h3>
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

        <!-- Lokale Offline Anonymisierung und De-Anonymisierung -->
        <div v-show="activeTab === 'anonymize'">
          <h2>🔐 Lokale Offline Anonymisierung & De-Anonymisierung</h2>
          <p>
            Die Hauptfunktionalität dieser Anwendung: <strong>Lokale, KI-gestützte Anonymisierung</strong> sensibler Texte
            direkt im Browser - ohne Datenübertragung an externe Server.
          </p>

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

          <h3 class="mt-6">3. Review & Überprüfung</h3>
          <p>
            Der <strong>Review-Prozess</strong> ist essenziell: Überprüfen Sie alle erkannten Entitäten sorgfältig,
            da die KI-Erkennung eine Genauigkeit von ca. 90-95% erreicht.
          </p>

          <h4 class="font-semibold mt-4">Scroll-Review-System:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Der <strong>Output-Bereich</strong> zeigt den anonymisierten Text</li>
            <li>Eine <strong>Fortschrittsanzeige</strong> unter dem Output-Bereich zeigt Ihren Prüffortschritt</li>
            <li>Scrollen Sie durch <strong>100% des Textes</strong>, um den "Kopieren"-Button freizuschalten</li>
            <li>Das 🔒-Symbol verschwindet vom Button, sobald der Text vollständig geprüft wurde</li>
          </ol>

          <h4 class="font-semibold mt-4">Interaktive Überprüfung:</h4>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Klick auf Entität in der Liste</strong> → Alle Platzhalter dieser Entität werden im Text hervorgehoben</li>
            <li><strong>Klick auf Platzhalter im Text</strong> → Die zugehörige Entität in der Liste wird markiert</li>
            <li>So können Sie schnell prüfen, welche Textstellen ersetzt wurden</li>
          </ul>

          <h3 class="mt-6">4. Entitäten bearbeiten & anpassen</h3>

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

          <h3 class="mt-6">5. Anonymisierten Text verwenden</h3>
          <ol class="list-decimal list-inside space-y-2">
            <li>Der anonymisierte Text wird im <strong>rechten Bereich</strong> angezeigt</li>
            <li>Scrollen Sie durch den gesamten Text (100%), um die Review-Anforderung zu erfüllen</li>
            <li>Der <strong>"Kopieren"-Button</strong> wird freigeschaltet</li>
            <li>Klicken Sie auf <strong>"Kopieren"</strong>, um den Text in die Zwischenablage zu kopieren</li>
            <li>Der Text ist nun bereit zur datenschutzkonformen Verwendung mit externen KI-Services</li>
          </ol>

          <div class="divider my-6"></div>

          <h3>6. De-Anonymisierung</h3>
          <p>
            Nach der Verarbeitung mit externen KI-Services können Sie die anonymisierten Texte wieder
            <strong>de-anonymisieren</strong>, um die Originalwerte wiederherzustellen.
          </p>

          <h4 class="font-semibold mt-4">Anonymisierten Text de-anonymisieren:</h4>
          <ol class="list-decimal list-inside space-y-2">
            <li>Wechseln Sie in den <strong>"De-Anonymisieren"</strong>-Modus (lila Button in der linken Seitenleiste)</li>
            <li>Laden Sie Ihren <strong>Case</strong> aus dem Case Management (falls gespeichert)</li>
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
                <li><strong>Methode 3:</strong> Text einfügen</li>
              </ul>
            </li>
            <li>Der de-anonymisierte Text erscheint automatisch im <strong>rechten Bereich</strong></li>
            <li>Alle Platzhalter (z.B. "[PERSON_1]") werden durch die Originalwerte ersetzt</li>
          </ol>

          <h4 class="font-semibold mt-4">Partielle De-Anonymisierung:</h4>
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

          <h4 class="font-semibold mt-4">De-Anonymisierungs-Historie:</h4>
          <p>Die letzten <strong>3 De-Anonymisierungen</strong> werden automatisch gespeichert:</p>
          <ol class="list-decimal list-inside space-y-2">
            <li>Unter dem Output-Bereich finden Sie die <strong>"Pseudonymize History"</strong></li>
            <li>Klicken Sie auf einen Eintrag, um eine frühere De-Anonymisierung zu laden</li>
            <li>Die entsprechenden Eingaben und Entitäten werden wiederhergestellt</li>
            <li>Sie können zwischen den Einträgen wechseln</li>
          </ol>
        </div>

        <!-- Fallmanagement -->
        <div v-show="activeTab === 'casemanagement'">
          <h2>📁 Fallmanagement</h2>
          <p>
            Das <strong>Fallmanagement</strong> ermöglicht die Organisation von Anonymisierungsprojekten in strukturierten Cases.
            Es bietet zentrale Vorteile für die Arbeit mit sensiblen Dokumenten.
          </p>

          <h3>Warum Fallmanagement?</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">🔗 Konsistente Entitätenliste</h4>
                <p class="text-xs">
                  Verwenden Sie <strong>dieselben Entitätszuordnungen</strong> über den gesamten Fall und über
                  <strong>mehrere Dokumente</strong> hinweg. Personennamen werden immer gleich anonymisiert.
                </p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">♻️ Wiederverwendbarkeit</h4>
                <p class="text-xs">
                  Speichern Sie <strong>zentrale Dokumente</strong> (z.B. Akte, Sachverhalt) im Case und verwenden Sie
                  diese bei mehreren <strong>KI-Verarbeitungen</strong> als Kontext.
                </p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">📝 Kontext-Verwaltung</h4>
                <p class="text-xs">
                  Nutzen Sie gespeicherte Dokumente als <strong>Kontext</strong> für Prompts. Bauen Sie eine
                  <strong>konsistente Wissensbasis</strong> für Ihre KI-Anfragen auf.
                </p>
              </div>
            </div>
          </div>

          <h3 class="mt-6">1. Neuen Fall anlegen</h3>
          <ol class="list-decimal list-inside space-y-2">
            <li>Klicken Sie auf das <strong>Ordner-Symbol</strong> (📁) oben rechts</li>
            <li>Klicken Sie auf <strong>"Neuer Case"</strong></li>
            <li>Geben Sie einen <strong>aussagekräftigen Case-Namen</strong> ein (z.B. "Vertrag Müller AG 2024")</li>
            <li>Optional: Fügen Sie eine <strong>Beschreibung</strong> hinzu (z.B. "Vertragsverhandlung mit Müller AG, Januar-März 2024")</li>
            <li>Der neue Case wird <strong>aktiv</strong> und automatisch im Browser-Speicher gespeichert</li>
            <li>Alle neuen Anonymisierungen werden diesem Case zugeordnet</li>
          </ol>

          <h3 class="mt-6">2. Dokumente im Fall verwalten</h3>
          <p>
            Ein Case kann mehrere <strong>Dokumente</strong> enthalten, die jeweils einen anonymisierten Text
            und seine zugehörige Entitätenliste speichern.
          </p>

          <h4 class="font-semibold mt-4">Dokument anlegen:</h4>
          <ol class="list-decimal list-inside space-y-2">
            <li>Führen Sie eine <strong>Anonymisierung</strong> durch (siehe Tab "Anonymisierung")</li>
            <li>Im <strong>Output-Bereich</strong> (rechts) finden Sie unter dem anonymisierten Text Buttons</li>
            <li>Klicken Sie auf <strong>"Als Dokument speichern"</strong> oder <strong>"Save to Case"</strong></li>
            <li>Geben Sie einen <strong>Dokumentnamen</strong> ein (z.B. "Sachverhalt", "E-Mail vom 12.01.2024", "Vertragsversion 3")</li>
            <li>Das Dokument wird dem aktiven Case hinzugefügt</li>
            <li>Sie können beliebig viele Dokumente pro Case anlegen</li>
          </ol>

          <div class="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>
              <strong>Wichtig:</strong> Gespeicherte Dokumente enthalten sowohl den <strong>anonymisierten Text</strong> als auch den
              <strong>Originaltext</strong> und die <strong>Entitätenliste</strong>.
            </span>
          </div>

          <h3 class="mt-6">3. Entitätenliste aktualisieren</h3>
          <p>
            Die <strong>Entitätenliste des Cases</strong> wird automatisch bei jeder neuen Anonymisierung erweitert.
            Sie können sie aber auch manuell verwalten.
          </p>

          <h4 class="font-semibold mt-4">Automatische Aktualisierung:</h4>
          <ul class="list-disc list-inside space-y-1">
            <li>Wenn Sie ein <strong>neues Dokument</strong> zum Case hinzufügen, werden alle neuen Entitäten automatisch zur Case-Entitätenliste hinzugefügt</li>
            <li>Bereits vorhandene Entitäten werden <strong>wiederverwendet</strong> (gleicher Platzhalter)</li>
            <li>Die Entitätenliste wird <strong>konsistent</strong> über alle Dokumente des Falls gehalten</li>
          </ul>

          <h4 class="font-semibold mt-4">Manuelle Aktualisierung:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Öffnen Sie den aktiven Case über das <strong>Ordner-Symbol</strong> (📁)</li>
            <li>Klicken Sie auf <strong>"Entitäten verwalten"</strong></li>
            <li>Sie können:
              <ul class="list-disc list-inside ml-6">
                <li>Neue Entitäten hinzufügen</li>
                <li>Bestehende Entitäten bearbeiten</li>
                <li>Entitäten löschen (betrifft alle Dokumente des Cases!)</li>
              </ul>
            </li>
          </ol>

          <h3 class="mt-6">4. Case laden & verwalten</h3>

          <h4 class="font-semibold mt-4">Case laden:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Klicken Sie auf das <strong>Ordner-Symbol</strong> (📁) oben rechts</li>
            <li>Eine Liste aller gespeicherten Cases erscheint</li>
            <li>Klicken Sie auf den gewünschten <strong>Case-Namen</strong></li>
            <li>Der Case wird geladen und als <strong>aktiver Case</strong> gesetzt</li>
            <li>Alle zugehörigen Dokumente und Entitäten stehen zur Verfügung</li>
          </ol>

          <h4 class="font-semibold mt-4">Case exportieren:</h4>
          <ul class="list-disc list-inside space-y-1">
            <li>Klicken Sie auf den <strong>💾-Button</strong> neben dem Case-Namen</li>
            <li>Eine <strong>JSON-Datei</strong> wird heruntergeladen</li>
            <li>Diese Datei enthält alle Dokumente, Entitäten und Metadaten des Cases</li>
            <li>Nutzen Sie dies für <strong>Backups</strong> oder <strong>Übertragung</strong> auf andere Geräte</li>
          </ul>

          <h4 class="font-semibold mt-4">Case importieren:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Klicken Sie auf <strong>"Case importieren"</strong></li>
            <li>Wählen Sie eine zuvor exportierte <strong>JSON-Datei</strong></li>
            <li>Der Case wird wiederhergestellt und zur Case-Liste hinzugefügt</li>
          </ol>

          <h4 class="font-semibold mt-4">Case löschen:</h4>
          <ul class="list-disc list-inside space-y-1">
            <li>Klicken Sie auf den <strong>🗑️-Button</strong> neben dem Case-Namen</li>
            <li><strong>Achtung:</strong> Diese Aktion kann <strong>nicht rückgängig gemacht</strong> werden!</li>
            <li>Alle Dokumente und Entitäten des Cases werden permanent gelöscht</li>
          </ul>

          <div class="alert alert-success mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Best Practice:</strong> Erstellen Sie für jeden Mandanten/Projekt einen eigenen Case.
              Exportieren Sie wichtige Cases regelmäßig als Backup!
            </span>
          </div>
        </div>

        <!-- KI-Inferenz -->
        <div v-show="activeTab === 'infer'">
          <h2>🤖 KI-Inferenz mit kommerziellen Modellen</h2>
          <p>
            Verarbeiten Sie Ihre <strong>anonymisierten Texte</strong> datenschutzkonform mit kommerziellen KI-Providern (Google Gemini).
            Nutzen Sie die <strong>Prompt Library</strong> und <strong>Textbausteinbibliothek</strong> für effiziente, wiederverwendbare Workflows.
          </p>

          <div class="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span><strong>Voraussetzung:</strong> Google Gemini API-Schlüssel erforderlich (siehe Tab "Einstellungen")</span>
          </div>

          <h3>1. Prompt Library - Wiederverwendbare Aufgabenstellungen</h3>
          <p>
            Die <strong>Prompt Library</strong> ermöglicht es Ihnen, häufig verwendete Aufgabenstellungen zu speichern
            und wiederzuverwenden. Jeder Prompt kann Textbausteine und Platzhalter enthalten.
          </p>

          <h4 class="font-semibold mt-4">Prompt erstellen:</h4>
          <ol class="list-decimal list-inside space-y-2">
            <li>Klicken Sie auf das <strong>Listen-Symbol</strong> (☰) oben rechts</li>
            <li>Klicken Sie auf <strong>"Neuer Prompt"</strong></li>
            <li>Geben Sie einen <strong>aussagekräftigen Namen</strong> ein (z.B. "Rechtliche Analyse", "Sachverhaltsextraktion")</li>
            <li>Schreiben Sie Ihren Prompt-Text</li>
            <li>Optional: Verwenden Sie <strong>Platzhalter</strong> (siehe unten)</li>
            <li>Klicken Sie auf <strong>"Speichern"</strong></li>
          </ol>

          <h4 class="font-semibold mt-4">Der &lbrace;&lbrace;fanontext&rbrace;&rbrace; Platzhalter:</h4>
          <div class="card bg-base-200 mt-3">
            <div class="card-body">
              <p class="text-sm">
                Der Platzhalter <code>&lbrace;&lbrace;fanontext&rbrace;&rbrace;</code> (mit doppelten geschweiften Klammern) wird automatisch durch den
                <strong>anonymisierten Text</strong> aus dem Output-Bereich ersetzt.
              </p>
              <div class="divider my-2"></div>
              <p class="text-xs"><strong>Beispiel-Prompt:</strong></p>
              <pre class="text-xs bg-base-300 p-2 rounded mt-1">Analysiere den folgenden Sachverhalt und extrahiere alle relevanten Rechtsfragen:

&lbrace;&lbrace;fanontext&rbrace;&rbrace;

Gib die Rechtsfragen als nummerierte Liste aus.</pre>
              <p class="text-xs mt-2">
                Beim Inferieren wird <code>&lbrace;&lbrace;fanontext&rbrace;&rbrace;</code> durch Ihren anonymisierten Text ersetzt.
              </p>
            </div>
          </div>

          <h3 class="mt-6">2. Textbausteinbibliothek</h3>
          <p>
            Textbausteine sind <strong>wiederverwendbare Textblöcke</strong>, die Sie in Prompts einfügen können.
            Ideal für Gesetzestexte, rechtliche Voraussetzungen, oder Prompt-Beispiele (One-Shot Prompting).
          </p>

          <h4 class="font-semibold mt-4">Textbaustein erstellen:</h4>
          <ol class="list-decimal list-inside space-y-2">
            <li>Klicken Sie auf das <strong>§-Symbol</strong> oben rechts</li>
            <li>Klicken Sie auf <strong>"Neuer Textbaustein"</strong></li>
            <li>Geben Sie einen <strong>Namen</strong> ein (z.B. "§ 823 BGB", "OR Art. 41", "Beispiel-Analyse")</li>
            <li>Fügen Sie den <strong>Textinhalt</strong> ein (z.B. Gesetzestext, rechtliche Voraussetzungen)</li>
            <li>Klicken Sie auf <strong>"Speichern"</strong></li>
            <li>Der Textbaustein erhält automatisch eine <strong>eindeutige ID</strong></li>
          </ol>

          <h4 class="font-semibold mt-4">Textbaustein in Prompt verwenden:</h4>
          <div class="card bg-base-200 mt-3">
            <div class="card-body">
              <p class="text-sm">
                Verwenden Sie <code>&lbrace;&lbrace;textblock:ID&rbrace;&rbrace;</code> in Ihrem Prompt, um einen Textbaustein einzufügen.
                Die ID sehen Sie in der Textbaustein-Übersicht.
              </p>
              <div class="divider my-2"></div>
              <p class="text-xs"><strong>Beispiel-Prompt mit Textbausteinen:</strong></p>
              <pre class="text-xs bg-base-300 p-2 rounded mt-1">Prüfe, ob der folgende Sachverhalt die Voraussetzungen
von § 823 BGB erfüllt:

&lbrace;&lbrace;textblock:gesetz_823bgb&rbrace;&rbrace;

Sachverhalt:
&lbrace;&lbrace;fanontext&rbrace;&rbrace;

Orientiere dich an diesem Beispiel:
&lbrace;&lbrace;textblock:beispiel_analyse_1&rbrace;&rbrace;</pre>
              <p class="text-xs mt-2">
                <strong>One-Shot Prompting:</strong> Speichern Sie gelungene Analysebeispiele als Textbausteine
                und verwenden Sie diese als Vorlagen für die KI.
              </p>
            </div>
          </div>

          <h3 class="mt-6">3. Prompt starten (Inferieren)</h3>
          <p>
            Sie haben <strong>drei Möglichkeiten</strong>, eine KI-Inferenz zu starten:
          </p>

          <h4 class="font-semibold mt-4">Methode 1: Quick Prompting</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Im <strong>Anonymisierungs-Modus</strong>: Stellen Sie sicher, dass der Text vollständig geprüft wurde</li>
            <li>Klicken Sie auf <strong>"Quick Infer"</strong> unter dem Output-Bereich</li>
            <li>Das <strong>Prompt-Auswahl-Modal</strong> öffnet sich</li>
            <li>Wählen Sie einen <strong>Prompt aus der Dropdown-Liste</strong></li>
            <li>Klicken Sie auf <strong>"Inferenz starten"</strong></li>
            <li>Die KI-Antwort erscheint in einem Popup-Fenster</li>
          </ol>

          <h4 class="font-semibold mt-4">Methode 2: Aus der Prompt Library</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Öffnen Sie die <strong>Prompt Library</strong> (☰-Symbol)</li>
            <li>Klicken Sie bei einem Prompt auf <strong>"Inferieren"</strong></li>
            <li>Der Prompt wird mit dem aktuellen Output-Text ausgeführt</li>
            <li>Die KI-Antwort erscheint in einem Popup-Fenster</li>
          </ol>

          <h4 class="font-semibold mt-4">Methode 3: Mit vorläufiger Anpassung (PromptEditInferenceModal)</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Wählen Sie einen Prompt über <strong>Quick Infer</strong> oder die <strong>Prompt Library</strong></li>
            <li>Klicken Sie auf <strong>"Bearbeiten & Inferieren"</strong> oder <strong>"Edit before inference"</strong></li>
            <li>Das <strong>PromptEditInferenceModal</strong> öffnet sich</li>
            <li>Sie können den Prompt <strong>temporär anpassen</strong>, ohne ihn in der Library zu ändern</li>
            <li>Klicken Sie auf <strong>"Inferenz starten"</strong></li>
            <li>Die KI-Antwort erscheint basierend auf Ihrer angepassten Version</li>
          </ol>

          <div class="alert alert-success mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Tipp:</strong> Verwenden Sie <strong>"Preview Full Prompt"</strong> im Modal, um den vollständigen Prompt
              inklusive aller eingefügten Textbausteine zu sehen, bevor Sie die Inferenz starten.
            </span>
          </div>

          <h3 class="mt-6">4. Kontext-Auswahl</h3>
          <p>Sie haben mehrere Möglichkeiten, Kontext für die KI-Inferenz bereitzustellen:</p>

          <div class="space-y-3 mt-3">
            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">1. Gesamter Text (&lbrace;&lbrace;fanontext&rbrace;&rbrace;)</h4>
                <p class="text-xs">
                  Verwenden Sie <code>&lbrace;&lbrace;fanontext&rbrace;&rbrace;</code> im Prompt. Der komplette Output wird als Kontext eingefügt.
                </p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">2. Textauswahl</h4>
                <p class="text-xs">
                  Markieren Sie Text im Output-Bereich <strong>vor</strong> dem Klick auf Quick Infer.
                  Nur die Auswahl wird verwendet.
                </p>
              </div>
            </div>

            <div class="card bg-base-200">
              <div class="card-body py-3">
                <h4 class="font-semibold text-sm">3. Case-Dokumente als Kontext</h4>
                <p class="text-xs">
                  Nutzen Sie gespeicherte Case-Dokumente als zusätzlichen Kontext. Ideal für konsistente Analysen
                  über mehrere Dokumente hinweg.
                </p>
              </div>
            </div>
          </div>

          <h3 class="mt-6">5. Beispiel-Anwendungsfälle</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="badge badge-lg badge-outline">Rechtliche Analyse</div>
            <div class="badge badge-lg badge-outline">Sachverhaltsextraktion</div>
            <div class="badge badge-lg badge-outline">Zusammenfassung</div>
            <div class="badge badge-lg badge-outline">Vertragsanalyse</div>
            <div class="badge badge-lg badge-outline">Anspruchsprüfung</div>
            <div class="badge badge-lg badge-outline">Übersetzung</div>
          </div>
        </div>

        <!-- Einstellungen -->
        <div v-show="activeTab === 'advanced'">
          <h2>⚙️ Einstellungen</h2>
          <p>
            Konfigurieren Sie die Anwendung nach Ihren Bedürfnissen. Alle Einstellungen werden lokal im Browser gespeichert.
          </p>

          <h3>Einstellungen-Menü öffnen</h3>
          <ol class="list-decimal list-inside space-y-1">
            <li>Klicken Sie auf das <strong>Zahnrad-Symbol</strong> (⚙️) oben rechts</li>
            <li>Wählen Sie <strong>"Einstellungen konfigurieren"</strong></li>
            <li>Das Einstellungs-Modal öffnet sich</li>
          </ol>

          <h3 class="mt-6">API-Konfiguration</h3>
          <p>Konfigurieren Sie den Zugang zu kommerziellen KI-Providern für die Inferenz-Funktionalität.</p>

          <h4 class="font-semibold mt-4">Google Gemini API-Schlüssel:</h4>
          <ol class="list-decimal list-inside space-y-2">
            <li>Öffnen Sie die <strong>Einstellungen</strong> (⚙️-Symbol)</li>
            <li>Geben Sie Ihren <strong>Google Gemini API-Schlüssel</strong> ein</li>
            <li>Klicken Sie auf <strong>"Speichern"</strong></li>
            <li>Die Prompt Library und KI-Inferenz Funktionen werden aktiviert</li>
          </ol>

          <div class="card bg-base-200 mt-4">
            <div class="card-body">
              <h4 class="font-semibold">API-Schlüssel erhalten:</h4>
              <ul class="list-disc list-inside text-sm">
                <li>Besuchen Sie <a href="https://ai.google.dev/" target="_blank" class="link">https://ai.google.dev/</a></li>
                <li>Erstellen Sie ein Projekt (falls noch nicht vorhanden)</li>
                <li>Generieren Sie einen API-Schlüssel für Gemini</li>
                <li>Kopieren Sie den Schlüssel und fügen Sie ihn in den Einstellungen ein</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <h3>Restricted Mode</h3>
          <p>
            Der <strong>Restricted Mode</strong> ist standardmäßig aktiviert und verhindert das versehentliche
            Kopieren nicht vollständig geprüfter Texte.
          </p>

          <h4 class="font-semibold mt-4">Restricted Mode deaktivieren:</h4>
          <ol class="list-decimal list-inside space-y-1">
            <li>Öffnen Sie <strong>Einstellungen</strong> (⚙️-Symbol)</li>
            <li>Wählen Sie <strong>"Einstellungen konfigurieren"</strong></li>
            <li>Geben Sie das <strong>Master-Passwort</strong> ein</li>
            <li>Der Restricted Mode wird für die aktuelle Sitzung deaktiviert</li>
            <li>Nach dem Schließen des Browsers wird er automatisch wieder aktiviert</li>
          </ol>

          <div class="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>Hinweis:</strong> Wenn das Master-Passwort geändert wird, werden alle aktiven Sitzungen
              automatisch auf Restricted Mode zurückgesetzt.
            </span>
          </div>

          <div class="divider"></div>

          <h3>Browser-Benachrichtigungen</h3>
          <p>
            Die Anwendung kann Desktop-Benachrichtigungen senden, um Sie über abgeschlossene Vorgänge zu informieren
            (besonders nützlich bei langen Verarbeitungen im Hintergrund).
          </p>

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
            <li>✅ KI-Inferenz abgeschlossen</li>
            <li>✅ Modell-Download abgeschlossen</li>
          </ul>

          <div class="divider"></div>

          <h3>Weitere Einstellungsmöglichkeiten</h3>

          <h4 class="font-semibold mt-4">Modell-Verwaltung:</h4>
          <ul class="list-disc list-inside space-y-1">
            <li>Überprüfen Sie den <strong>Download-Status</strong> der KI-Modelle</li>
            <li>Löschen Sie heruntergeladene Modelle, um Speicherplatz freizugeben</li>
            <li>Laden Sie Modelle bei Bedarf neu herunter</li>
          </ul>

          <h4 class="font-semibold mt-4">Daten-Verwaltung:</h4>
          <ul class="list-disc list-inside space-y-1">
            <li><strong>Alle Daten löschen:</strong> Entfernt alle Cases, Prompts, Textbausteine und Einstellungen</li>
            <li><strong>Export/Import:</strong> Sichern Sie Ihre Daten oder übertragen Sie sie auf andere Geräte</li>
            <li><strong>Browser-Speicher:</strong> Überprüfen Sie den verwendeten Speicherplatz</li>
          </ul>

          <div class="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>
              <strong>Datenschutz:</strong> Alle Einstellungen und Daten werden ausschließlich lokal im Browser gespeichert.
              Es erfolgt keine Übertragung an externe Server (außer bei Nutzung der KI-Inferenz mit Ihrem API-Schlüssel).
            </span>
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
  { id: 'anonymize', name: 'Anonymisierung & De-Anonymisierung', icon: '🔐' },
  { id: 'casemanagement', name: 'Fallmanagement', icon: '📁' },
  { id: 'infer', name: 'KI-Inferenz', icon: '🤖' },
  { id: 'advanced', name: 'Einstellungen', icon: '⚙️' },
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
