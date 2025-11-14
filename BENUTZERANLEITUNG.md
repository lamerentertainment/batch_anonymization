# Benutzeranleitung - Anonymisierungs-Tool

## Inhaltsverzeichnis
1. [Einführung](#einführung)
2. [Funktionen im Restricted Mode](#funktionen-im-restricted-mode)
3. [Funktionen im Unrestricted Mode](#funktionen-im-unrestricted-mode)
4. [Detaillierte Funktionsbeschreibungen](#detaillierte-funktionsbeschreibungen)
5. [Erweiterte Funktionen](#erweiterte-funktionen)
6. [Tipps und Best Practices](#tipps-und-best-practices)

---

## Einführung

Diese Webanwendung ermöglicht die **lokale, KI-gestützte Anonymisierung** und **De-Anonymisierung** von sensiblen Texten. Alle Daten werden ausschließlich im Browser verarbeitet - es erfolgt **keine Übertragung an externe Server** (außer bei optionaler Nutzung der Google Gemini API).

### Unterstützte Entitätstypen
- 👤 **PERSON** - Namen von Personen
- 📍 **LOCATION** - Orte, Adressen, Städte
- 🏢 **ORGANIZATION** - Firmen, Behörden, Institutionen
- 📅 **DATE** - Datumsangaben
- ⏰ **TIME** - Zeitangaben
- 🚗 **LICENSE_PLATE** - Kennzeichen
- 🚙 **CAR** - Fahrzeugbezeichnungen
- 🔧 **OTHER** - Sonstige sensible Informationen

---

## Funktionen im Restricted Mode

Der **Restricted Mode** ist standardmäßig **aktiviert** und dient dem Schutz vor versehentlichem Kopieren nicht vollständig geprüfter Texte. Er stellt sicher, dass Benutzer anonymisierte Texte vollständig durchgesehen haben, bevor sie diese verwenden können.

### 🔒 Was ist im Restricted Mode eingeschränkt?

#### Im Anonymisierungs-Modus:
- ❌ **Kopieren blockiert**: Der "Kopieren"-Button ist gesperrt, bis Sie den anonymisierten Text vollständig durchgescrollt haben
- ❌ **Quick Infer blockiert**: Die KI-Inferenz-Funktion ist gesperrt, bis der Text vollständig geprüft wurde
- ✅ **Einfügen erlaubt**: Sie können Text manuell in das Eingabefeld einfügen
- ✅ **Datei-Upload erlaubt**: Upload von TXT, PDF und DOCX-Dateien ist möglich

#### Im De-Anonymisierungs-Modus:
- ✅ **Kopieren erlaubt**: De-anonymisierte Texte können jederzeit kopiert werden
- ❌ **Einfügen blockiert**: Aus Sicherheitsgründen ist das Einfügen in den Text-Input gesperrt
- ✅ **Datei-Upload erlaubt**: Upload von anonymisierten Dokumenten ist möglich

### 🔓 Restricted Mode entsperren

Um den Restricted Mode zu entsperren:

1. Klicken Sie auf das **Zahnrad-Symbol** (⚙️) oben rechts
2. Wählen Sie **"Einstellungen konfigurieren"**
3. Geben Sie das **Master-Passwort** ein
4. Der Restricted Mode wird für die aktuelle Sitzung deaktiviert
5. Nach dem Schließen des Browsers wird der Restricted Mode automatisch wieder aktiviert

**Hinweis:** Wenn das Master-Passwort geändert wird, werden alle aktiven Sitzungen automatisch auf Restricted Mode zurückgesetzt.

### 📊 Scroll-Review-System

Das Scroll-Review-System stellt sicher, dass Sie den gesamten anonymisierten Text geprüft haben:

1. Der **Output-Bereich** wird in mehrere Zonen unterteilt
2. Eine **Fortschrittsanzeige** unter dem Output-Bereich zeigt, wie viel Sie bereits durchgescrollt haben
3. Sie müssen **100% des Textes durchscrollen**, um den "Kopieren"-Button freizuschalten
4. Der Fortschritt wird in Echtzeit aktualisiert
5. Das Symbol 🔒 verschwindet vom Button, sobald der Text vollständig geprüft wurde

---

## Funktionen im Unrestricted Mode

Wenn Sie den Restricted Mode mit dem Master-Passwort entsperrt haben, stehen Ihnen folgende zusätzliche Freiheiten zur Verfügung:

### ✅ Im Anonymisierungs-Modus:
- **Sofortiges Kopieren**: Der "Kopieren"-Button ist sofort verfügbar (kein Scroll-Review erforderlich)
- **Sofortige KI-Inferenz**: Quick Infer steht sofort zur Verfügung
- **Freies Einfügen**: Keine Einschränkungen beim Texteinfügen

### ✅ Im De-Anonymisierungs-Modus:
- **Freies Einfügen**: Sie können Text direkt in das Eingabefeld einfügen
- **Kopieren weiterhin erlaubt**: Alle Kopierfunktionen bleiben verfügbar

### ⚠️ Sicherheitshinweis
Der Unrestricted Mode ist für erfahrene Benutzer gedacht, die die Verantwortung für die Prüfung ihrer Texte selbst übernehmen. Nutzen Sie ihn mit Bedacht!

---

## Detaillierte Funktionsbeschreibungen

### 1. Anonymisierungs-Modus

#### 1.1 Text eingeben

**Methode 1: Manuelles Eingeben/Einfügen**
1. Wechseln Sie in den **"Anonymisieren"**-Modus (linke Seitenleiste)
2. Geben Sie Ihren Text in das **linke Textfeld** ein oder fügen Sie ihn ein (Ctrl+V)
3. Der Text kann beliebig lang sein

**Methode 2: Datei hochladen**
1. Klicken Sie auf das **📎 Datei-Symbol** über dem Eingabefeld
2. Wählen Sie eine TXT, PDF oder DOCX-Datei aus
3. Der Text wird automatisch extrahiert und angezeigt
4. Bei PDFs und DOCX-Dateien werden Formatierungen entfernt

**Methode 3: Drag & Drop**
1. Ziehen Sie eine Datei direkt in das **Eingabefeld**
2. Der Text wird automatisch extrahiert

#### 1.2 Entitäten erkennen

1. Klicken Sie auf **"Anonymisierung starten"** (grüner Button in der linken Seitenleiste)
2. Die KI analysiert den Text und erkennt sensible Entitäten
3. **Beim ersten Mal**: Die KI-Modelle (~1 GB) werden heruntergeladen
   - Ein Fortschrittsbalken zeigt den Download-Status
   - Dies geschieht nur einmal, danach sind die Modelle lokal verfügbar
4. Nach der Analyse erscheinen die erkannten Entitäten in der **Liste links**

#### 1.3 Entitäten bearbeiten

**Erkannte Entitäten anpassen:**
1. Jede erkannte Entität wird in der linken Seitenleiste aufgelistet
2. Klicken Sie auf den **"Bearbeiten"-Button** (✏️) neben einer Entität
3. Sie können:
   - Den **Typ** ändern (z.B. von PERSON zu ORGANIZATION)
   - Den **Ersetzungstext** (Platzhalter) anpassen
   - Die Entität **löschen** (🗑️-Symbol)

**Manuelle Entität hinzufügen:**
1. Scrollen Sie in der linken Seitenleiste nach unten zum Formular **"Entität hinzufügen"**
2. Geben Sie den **Originaltext** ein (z.B. "Geheimprojekt Alpha")
3. Wählen Sie den **Entitätstyp** aus dem Dropdown
4. Optional: Passen Sie den **Platzhalter** an (z.B. "[PROJEKT_1]")
5. Klicken Sie auf **"Hinzufügen"**

**Regex-Pattern verwenden:**
1. Aktivieren Sie die Checkbox **"Regex Pattern"** im Formular
2. Geben Sie ein reguläres Ausdrucksmuster ein (z.B. `\d{3}-\d{4}` für Telefonnummern)
3. Alle Übereinstimmungen werden automatisch als Entitäten erfasst

#### 1.4 Anonymisierten Text verwenden

1. Der anonymisierte Text wird im **rechten Bereich** angezeigt
2. Im **Restricted Mode**: Scrollen Sie durch den gesamten Text (100%)
3. Der **"Kopieren"-Button** wird freigeschaltet
4. Klicken Sie auf **"Kopieren"**, um den Text in die Zwischenablage zu kopieren
5. Der Text ist nun bereit zur Verwendung in anderen Anwendungen

#### 1.5 Case Management - Projekt speichern

1. Klicken Sie auf das **Ordner-Symbol** (📁) oben rechts
2. Wählen Sie **"Neuen Case erstellen"** oder **"Case auswählen"**
3. Geben Sie einen **Case-Namen** ein (z.B. "Vertrag Müller AG")
4. Ihr aktueller Anonymisierungs-Status wird automatisch gespeichert:
   - Originaltext
   - Alle erkannten und bearbeiteten Entitäten
   - Anonymisierter Text
5. Sie können jederzeit zwischen Cases wechseln

**Case-Funktionen:**
- **Speichern**: Automatisch bei jeder Änderung
- **Laden**: Case aus der Liste auswählen
- **Löschen**: Case endgültig entfernen (⚠️ kann nicht rückgängig gemacht werden)
- **Exportieren**: Case als JSON-Datei herunterladen
- **Importieren**: Zuvor exportierten Case wieder laden

---

### 2. De-Anonymisierungs-Modus

#### 2.1 Anonymisierten Text de-anonymisieren

1. Wechseln Sie in den **"De-Anonymisieren"**-Modus (lila Button in der linken Seitenleiste)
2. Laden Sie Ihren **Case** aus dem Case Management (wenn gespeichert)
3. **Oder** laden Sie eine zuvor gespeicherte Entitätsliste:
   - Klicken Sie auf **"Entitäten laden"**
   - Wählen Sie die JSON-Datei mit den Entitäten aus

4. Geben Sie den anonymisierten Text ein:
   - **Methode 1**: Datei hochladen (📎-Symbol)
   - **Methode 2**: Drag & Drop
   - **Methode 3**: Text einfügen (nur im Unrestricted Mode)

5. Der de-anonymisierte Text erscheint automatisch im **rechten Bereich**
6. Alle Platzhalter (z.B. "[PERSON_1]") werden durch die Originalwerte ersetzt

#### 2.2 Partielle De-Anonymisierung

Sie können auswählen, **welche Entitäten** de-anonymisiert werden sollen:

1. In der linken Seitenleiste sehen Sie alle verfügbaren Entitäten
2. Deaktivieren Sie die **Checkboxen** bei Entitäten, die **nicht** de-anonymisiert werden sollen
3. Der Output wird in Echtzeit aktualisiert
4. Nur aktivierte Entitäten werden ersetzt

**Anwendungsfall:**
- Sie möchten Personennamen weiterhin anonymisiert lassen, aber Datumsangaben wiederherstellen
- Einfach nur die DATE-Entitäten aktivieren, alle PERSON-Entitäten deaktivieren

#### 2.3 De-Anonymisierungs-Historie

Die letzten **3 De-Anonymisierungen** werden automatisch gespeichert:

1. Unter dem Output-Bereich finden Sie die **"Pseudonymize History"**
2. Klicken Sie auf einen Eintrag, um eine frühere De-Anonymisierung zu laden
3. Die entsprechenden Eingaben und Entitäten werden wiederhergestellt
4. Sie können zwischen den Einträgen wechseln

---

### 3. Quick Infer - KI-gestützte Textverarbeitung

**Voraussetzung:** Google Gemini API-Schlüssel erforderlich

#### 3.1 API-Schlüssel konfigurieren

1. Klicken Sie auf das **Zahnrad-Symbol** (⚙️) oben rechts
2. Wählen Sie **"Einstellungen konfigurieren"**
3. Geben Sie Ihren **Google Gemini API-Schlüssel** ein
4. Klicken Sie auf **"Speichern"**
5. Die Prompt Library und Quick Infer Funktionen werden aktiviert

**API-Schlüssel erhalten:**
- Besuchen Sie https://ai.google.dev/
- Erstellen Sie ein Projekt
- Generieren Sie einen API-Schlüssel für Gemini

#### 3.2 Quick Infer verwenden

Quick Infer ermöglicht **schnelle KI-Inferenzen** direkt aus dem Output-Bereich:

1. **Im Anonymisierungs-Modus**: Stellen Sie sicher, dass der Text vollständig geprüft wurde (Restricted Mode)
2. Klicken Sie auf **"Quick Infer"** unter dem Output-Bereich
3. Das **Prompt-Auswahl-Modal** öffnet sich
4. Wählen Sie einen **vordefinierten Prompt** aus der Dropdown-Liste
5. **Optional**: Wählen Sie Kontext aus:
   - **Checkbox "Include entire text"**: Der gesamte Output wird als Kontext verwendet
   - **Oder**: Markieren Sie Text im Output-Bereich vor dem Klick auf Quick Infer (nur die Auswahl wird verwendet)
6. Klicken Sie auf **"Inferenz starten"**
7. Die KI-Antwort erscheint in einem **Popup-Fenster**

**Beispiel-Anwendungsfälle:**
- Zusammenfassung des anonymisierten Texts
- Rechtliche Analyse
- Übersetzung
- Sentiment-Analyse
- Schlüsselbegriff-Extraktion

#### 3.3 Kontext-Auswahl

Sie haben drei Möglichkeiten, Kontext für Quick Infer bereitzustellen:

1. **Gesamter Text**:
   - Aktivieren Sie "Include entire text" im Modal
   - Der komplette Output wird verwendet

2. **Textauswahl**:
   - Markieren Sie Text im Output-Bereich **vor** dem Klick auf Quick Infer
   - Nur die Auswahl wird an die KI gesendet

3. **Kein Kontext**:
   - Weder Text markieren noch "Include entire text" aktivieren
   - Nur der Prompt wird verwendet (z.B. für allgemeine Fragen)

#### 3.4 Full Prompt Preview

Bevor Sie die Inferenz starten, können Sie den **vollständigen Prompt** einsehen:

1. Im Prompt-Auswahl-Modal
2. Wählen Sie einen Prompt aus
3. Wählen Sie optional Kontext aus
4. Klicken Sie auf **"Preview Full Prompt"**
5. Ein Modal zeigt den **kompletten Prompt** inklusive aller eingefügten Textbausteine und Kontext
6. Sie können den Prompt **in die Zwischenablage kopieren** ("Copy Full Prompt")
7. Schließen Sie die Vorschau oder starten Sie die Inferenz direkt

---

### 4. Prompt Library - Wiederverwendbare KI-Prompts

Die Prompt Library ermöglicht die Verwaltung von **wiederverwendbaren KI-Prompts** mit dynamischen Textbausteinen.

#### 4.1 Prompt Library öffnen

1. Klicken Sie auf das **Listen-Symbol** (☰) oben rechts
2. Die Prompt Library öffnet sich als Modal

#### 4.2 Neuen Prompt erstellen

1. Klicken Sie auf **"Neuer Prompt"** oben im Modal
2. Geben Sie einen **Namen** ein (z.B. "Vertrags-Zusammenfassung")
3. Geben Sie den **Prompt-Text** in das große Textfeld ein
4. **Optional**: Fügen Sie **Textbausteine** ein:
   - Klicken Sie auf den Button **"Textbaustein einfügen"** (über dem Textfeld)
   - Wählen Sie einen Textbaustein aus der Dropdown-Liste
   - Der Platzhalter `{{textblock:ID}}` wird eingefügt
   - Beim Ausführen wird dieser durch den tatsächlichen Textbaustein ersetzt
5. **Optional**: Verwenden Sie den Platzhalter `{{anontext}}`:
   - Dieser wird durch den aktuellen Output-Text ersetzt (falls vorhanden)
   - Beispiel: "Fasse folgenden Text zusammen: {{anontext}}"
6. Klicken Sie auf **"Speichern"**

**Hinweis:** Der Platzhalter `{{anontext}}` ist **nicht mehr zwingend erforderlich**. Sie können Prompts auch ohne diesen Platzhalter erstellen und den Kontext über die Kontext-Auswahl bereitstellen.

#### 4.3 Prompt bearbeiten

1. Klicken Sie auf den **"Bearbeiten"-Button** (✏️) neben einem Prompt
2. Ändern Sie Name oder Prompt-Text
3. Klicken Sie auf **"Speichern"**

#### 4.4 Prompt löschen

1. Klicken Sie auf den **"Löschen"-Button** (🗑️) neben einem Prompt
2. Bestätigen Sie den Löschvorgang
3. Der Prompt wird dauerhaft entfernt

#### 4.5 Prompt ausführen

1. Klicken Sie auf den **"Ausführen"-Button** (▶️) neben einem Prompt
2. Das Prompt-Auswahl-Modal öffnet sich mit dem ausgewählten Prompt
3. Wählen Sie optional Kontext aus
4. Klicken Sie auf **"Inferenz starten"**
5. Die KI-Antwort erscheint in einem Popup

#### 4.6 Prompts exportieren/importieren

**Export:**
1. Alle Prompts werden lokal im Browser gespeichert
2. Verwenden Sie die Browser-Datenexport-Funktion für Backups

**Import:**
- Aktuell erfolgt Import über Browser-Datensynchronisation
- Manuelle JSON-Import-Funktion kann bei Bedarf hinzugefügt werden

---

### 5. Textbaustein Library - Wiederverwendbare Textblöcke

Die Textbaustein Library verwaltet **wiederverwendbare Textblöcke**, die in Prompts eingefügt werden können.

#### 5.1 Textbaustein Library öffnen

1. Klicken Sie auf das **§-Symbol** oben rechts
2. Die Textbaustein Library öffnet sich als Modal

#### 5.2 Neuen Textbaustein erstellen

1. Klicken Sie auf **"Neuer Textbaustein"**
2. Geben Sie einen **Namen** ein (z.B. "Standard-Disclaimer")
3. Geben Sie den **Textinhalt** ein
4. Klicken Sie auf **"Speichern"**
5. Der Textbaustein erhält automatisch eine eindeutige ID

#### 5.3 Textbaustein bearbeiten

1. Klicken Sie auf den **"Bearbeiten"-Button** (✏️)
2. Ändern Sie Name oder Inhalt
3. Klicken Sie auf **"Speichern"**

#### 5.4 Textbaustein löschen

1. Klicken Sie auf den **"Löschen"-Button** (🗑️)
2. Bestätigen Sie den Löschvorgang
3. **Achtung:** Prompts, die diesen Textbaustein verwenden, werden nicht automatisch aktualisiert

#### 5.5 Textbaustein in Prompt verwenden

1. Öffnen Sie die **Prompt Library**
2. Erstellen oder bearbeiten Sie einen Prompt
3. Klicken Sie auf **"Textbaustein einfügen"**
4. Wählen Sie den gewünschten Textbaustein aus der Dropdown-Liste
5. Der Platzhalter `{{textblock:ID}}` wird eingefügt
6. Speichern Sie den Prompt

**Beispiel:**
```
Analysiere folgenden Vertragstext:

{{textblock:abc123}}

{{anontext}}

Beachte dabei insbesondere die Kündigungsfristen.
```

Beim Ausführen wird `{{textblock:abc123}}` durch den tatsächlichen Textinhalt ersetzt.

---

### 6. Case Management - Projektverwaltung

Das Case Management ermöglicht die Organisation von Anonymisierungsprojekten in **wiederverwendbaren Cases**.

#### 6.1 Case Management öffnen

1. Klicken Sie auf das **Ordner-Symbol** (📁) oben rechts
2. Das Case Management Modal öffnet sich

#### 6.2 Neuen Case erstellen

1. Klicken Sie auf **"Neuer Case"**
2. Geben Sie einen **Case-Namen** ein (z.B. "Vertrag Müller AG 2024")
3. Optional: Geben Sie eine **Beschreibung** ein
4. Klicken Sie auf **"Erstellen"**
5. Der neue Case wird aktiv und in der Liste angezeigt

#### 6.3 Case laden

1. Klicken Sie auf einen **Case-Namen** in der Liste
2. Der Case wird geladen:
   - Input-Text wird wiederhergestellt
   - Alle Entitäten werden geladen
   - Anonymisierter Output wird angezeigt
   - Modus (Anonymisieren/De-Anonymisieren) wird wiederhergestellt

#### 6.4 Case speichern

- **Automatisches Speichern**: Änderungen werden automatisch im aktuellen Case gespeichert
- Kein manuelles Speichern erforderlich
- Gespeichert werden:
  - Input-Text
  - Alle Entitäten (original, Typ, Platzhalter)
  - Output-Text
  - Modus
  - Zeitstempel der letzten Änderung

#### 6.5 Case löschen

1. Klicken Sie auf den **"Löschen"-Button** (🗑️) neben einem Case
2. Bestätigen Sie den Löschvorgang
3. ⚠️ **Warnung**: Gelöschte Cases können nicht wiederhergestellt werden!

#### 6.6 Case exportieren

1. Klicken Sie auf den **"Export"-Button** (💾) neben einem Case
2. Eine JSON-Datei wird heruntergeladen
3. Diese enthält:
   - Alle Case-Daten
   - Entitäten
   - Texte
   - Zeitstempel

#### 6.7 Case importieren

1. Klicken Sie auf **"Case importieren"**
2. Wählen Sie eine zuvor exportierte JSON-Datei aus
3. Der Case wird in die Liste aufgenommen
4. Sie können ihn sofort verwenden

#### 6.8 Aktiven Case anzeigen

- Der **aktuell aktive Case** wird in der linken Seitenleiste unter den Modus-Buttons angezeigt
- Format: "📁 Case: [Case-Name]"
- Klicken Sie darauf, um das Case Management zu öffnen

---

## Erweiterte Funktionen

### 1. Browser-Benachrichtigungen

Die Anwendung kann **Desktop-Benachrichtigungen** senden, um Sie über lange Vorgänge zu informieren:

#### 1.1 Benachrichtigungen aktivieren

1. Öffnen Sie **Einstellungen** (⚙️-Symbol)
2. Aktivieren Sie **"Browser-Benachrichtigungen aktivieren"**
3. Ihr Browser fragt nach Erlaubnis für Benachrichtigungen
4. Klicken Sie auf **"Erlauben"**

#### 1.2 Wann werden Benachrichtigungen gesendet?

- ✅ **Entitätserkennung abgeschlossen** (wenn länger als 3 Sekunden)
- ✅ **Datei-Verarbeitung abgeschlossen**
- ✅ **KI-Inferenz abgeschlossen** (Quick Infer)
- ✅ **Modell-Download abgeschlossen**

**Vorteil:** Sie können in einem anderen Tab arbeiten und werden benachrichtigt, sobald die Verarbeitung fertig ist.

---

### 2. Regex-basierte Entitätserkennung

Für **spezielle Muster** (z.B. Telefonnummern, Kundennummern), die die KI nicht automatisch erkennt:

#### 2.1 Regex-Entität hinzufügen

1. Scrollen Sie in der linken Seitenleiste zum Formular **"Entität hinzufügen"**
2. Aktivieren Sie die **"Regex Pattern"**-Checkbox
3. Geben Sie ein reguläres Ausdrucksmuster ein:
   - **Telefonnummern**: `\+?[0-9]{1,4}[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{4,}`
   - **E-Mail-Adressen**: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
   - **Kundennummern**: `KD-\d{6}`
   - **IBANs**: `[A-Z]{2}\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{0,2}`
4. Wählen Sie den **Entitätstyp**
5. Optional: Passen Sie den Platzhalter an
6. Klicken Sie auf **"Hinzufügen"**
7. Alle Übereinstimmungen im Text werden automatisch als Entitäten erfasst

**Beispiel:**
- Pattern: `\+49[\s]?[0-9]{3}[\s]?[0-9]{7,}`
- Typ: OTHER
- Platzhalter: [TELEFON]
- → Alle deutschen Telefonnummern werden ersetzt

---

### 3. Datei-Formate

#### 3.1 TXT-Dateien
- **Einfachster Fall**: Reiner Text wird direkt übernommen
- Keine Formatierung
- Schnelle Verarbeitung

#### 3.2 PDF-Dateien
- **Text-Extraktion**: Funktioniert bei text-basierten PDFs
- **Gescannte PDFs**: Werden nicht unterstützt (keine OCR)
- Formatierung wird entfernt
- Mehrspaltige Layouts können zu unleserlichem Text führen

#### 3.3 DOCX-Dateien
- **Microsoft Word-Dokumente**
- Text wird extrahiert
- Formatierung wird entfernt
- Tabellen werden als Fließtext dargestellt

**Tipp:** Für beste Ergebnisse kopieren Sie Text manuell aus Ihrem Dokument, statt Dateien hochzuladen.

---

### 4. Datenverarbeitung und Speicherung

#### 4.1 Wo werden Daten gespeichert?

**Alle Daten bleiben lokal im Browser:**
- **IndexedDB**: Cases, Entitäten, Prompts, Textbausteine (~50 MB Limit)
- **localStorage**: Einstellungen, API-Schlüssel, Sicherheitsstatus (~5-10 MB)
- **Browser-Cache**: KI-Modelle (~1 GB)
- **Arbeitsspeicher**: Geladene Modelle während der Nutzung (~500 MB)

**Keine Server-Übertragung:**
- ✅ Ihre Texte verlassen niemals Ihren Computer
- ✅ Entitäten werden nicht hochgeladen
- ✅ Cases bleiben privat

**Ausnahme - Google Gemini API:**
- ❌ Bei Nutzung von Quick Infer werden Prompts und Kontext an Google gesendet
- Nur wenn Sie einen API-Schlüssel konfiguriert haben
- Sie kontrollieren, welche Daten gesendet werden

#### 4.2 Daten löschen

**Einzelne Daten:**
- Cases: Über Case Management löschen
- Prompts: Über Prompt Library löschen
- Textbausteine: Über Textbaustein Library löschen

**Alle Daten:**
1. Öffnen Sie die Browser-Entwicklertools (F12)
2. Gehen Sie zum Tab **"Application"** (Chrome) oder **"Storage"** (Firefox)
3. Wählen Sie **"IndexedDB"** → **"AnonDB"**
4. Klicken Sie auf **"Delete database"**
5. Wiederholen Sie für **"localStorage"**
6. Laden Sie die Seite neu

**Modelle löschen:**
1. Browser-Cache leeren
2. Die Modelle werden beim nächsten Start neu heruntergeladen

---

## Tipps und Best Practices

### ✅ Anonymisierung

1. **Prüfen Sie die erkannten Entitäten sorgfältig**
   - Die KI kann Fehler machen
   - Überprüfen Sie besonders Namen, Orte und Organisationen
   - Fügen Sie fehlende Entitäten manuell hinzu

2. **Verwenden Sie aussagekräftige Platzhalter**
   - Statt "[PERSON_1]" besser "[KLIENT]" oder "[KLÄGER]"
   - Erleichtert spätere De-Anonymisierung
   - Macht den Text lesbarer

3. **Speichern Sie Ihre Cases**
   - Erstellen Sie für jedes Projekt einen eigenen Case
   - Exportieren Sie wichtige Cases als Backup
   - Verwenden Sie beschreibende Namen

4. **Nutzen Sie Regex für spezielle Muster**
   - Telefonnummern, E-Mails, Kundennummern
   - Einmal definiert, immer wiederverwendbar
   - Spart Zeit bei wiederkehrenden Mustern

### ✅ De-Anonymisierung

1. **Bewahren Sie Entitäts-Mappings auf**
   - Exportieren Sie Cases nach der Anonymisierung
   - Speichern Sie die JSON-Datei sicher
   - Ohne Mapping können Sie nicht de-anonymisieren

2. **Verwenden Sie partielle De-Anonymisierung**
   - Nicht immer müssen alle Entitäten wiederhergestellt werden
   - Deaktivieren Sie Checkboxen für sensible Daten
   - Kontrollieren Sie, was sichtbar wird

3. **Nutzen Sie die Historie**
   - Die letzten 3 De-Anonymisierungen werden gespeichert
   - Schneller Zugriff auf frühere Versionen
   - Vergleichen Sie verschiedene Varianten

### ✅ KI-Inferenz (Quick Infer)

1. **Erstellen Sie wiederverwendbare Prompts**
   - Speichern Sie häufig verwendete Prompts in der Library
   - Verwenden Sie Textbausteine für Standard-Anweisungen
   - Kombinieren Sie mehrere Textbausteine

2. **Wählen Sie Kontext gezielt aus**
   - Markieren Sie nur relevante Textpassagen
   - Reduziert API-Kosten
   - Erhöht Antwortqualität

3. **Nutzen Sie die Prompt-Vorschau**
   - Prüfen Sie den vollständigen Prompt vor dem Senden
   - Vermeiden Sie unnötige API-Aufrufe
   - Optimieren Sie Ihre Prompts

### ✅ Performance

1. **Erste Nutzung**
   - Planen Sie 1-2 Minuten für Modell-Download ein
   - Stabile Internetverbindung erforderlich
   - Nur einmal nötig

2. **Große Texte**
   - Teilen Sie sehr lange Texte (>100.000 Zeichen) auf
   - Nutzen Sie Case Management für Struktur
   - Vermeiden Sie unnötige Neuberechnungen

3. **Browser-Empfehlungen**
   - Chrome oder Edge für beste Performance
   - Mindestens 4 GB RAM
   - Modernes Betriebssystem (Windows 10+, macOS 10.15+, Linux)

### ✅ Sicherheit

1. **Restricted Mode nutzen**
   - Aktivieren Sie ihn für normale Arbeit
   - Entsperren Sie nur bei Bedarf
   - Schützt vor versehentlichen Fehlern

2. **Master-Passwort schützen**
   - Teilen Sie das Passwort nicht
   - Ändern Sie es regelmäßig
   - Verwenden Sie ein starkes Passwort

3. **Backups erstellen**
   - Exportieren Sie wichtige Cases
   - Speichern Sie Backups außerhalb des Browsers
   - Testen Sie Wiederherstellung

4. **API-Schlüssel sichern**
   - Nutzen Sie nur vertrauenswürdige Geräte
   - Löschen Sie den Schlüssel nach Nutzung
   - Überwachen Sie API-Nutzung in der Google Cloud Console

### ✅ Datenschutz

1. **Lokale Verarbeitung bevorzugen**
   - Nutzen Sie Quick Infer nur wenn nötig
   - Anonymisierung funktioniert komplett offline
   - Keine Datenübertragung an Server

2. **Sensitive Daten schützen**
   - Löschen Sie Cases nach Projektabschluss
   - Leeren Sie Browser-Daten bei gemeinsam genutzten Geräten
   - Verwenden Sie private Browser-Fenster für extra Schutz

---

## Häufig gestellte Fragen (FAQ)

### ❓ Werden meine Daten auf einen Server hochgeladen?

**Nein.** Alle Daten werden ausschließlich lokal im Browser verarbeitet. Ausnahme: Wenn Sie die Google Gemini API für Quick Infer verwenden, werden Prompts und ausgewählter Kontext an Google gesendet.

### ❓ Kann ich die Anwendung offline nutzen?

**Ja.** Nach dem ersten Download der KI-Modelle funktioniert die Anonymisierung und De-Anonymisierung komplett offline. Nur Quick Infer benötigt Internetverbindung (Google Gemini API).

### ❓ Wie genau ist die KI-Erkennung?

Die KI (GLiNER) erreicht eine **Genauigkeit von ca. 90-95%** bei gängigen Entitäten wie Personennamen und Orten. Sie sollten jedoch **immer manuell nachprüfen** und fehlende Entitäten ergänzen.

### ❓ Was passiert beim Löschen des Browser-Cache?

- **IndexedDB und localStorage**: Bleiben erhalten
- **Browser-Cache**: KI-Modelle werden gelöscht und müssen neu heruntergeladen werden
- **Cases und Einstellungen**: Bleiben erhalten

### ❓ Kann ich die Anwendung auf mehreren Geräten nutzen?

Ja, aber die Daten sind **nicht synchronisiert**. Jedes Gerät hat seine eigenen lokalen Daten. Nutzen Sie die **Export/Import-Funktionen** für Cases, um Daten zwischen Geräten zu übertragen.

### ❓ Wie kann ich das Master-Passwort ändern?

Das Master-Passwort wird vom Administrator der Anwendung festgelegt und kann nicht direkt in der Anwendung geändert werden. Kontaktieren Sie Ihren Administrator.

### ❓ Gibt es ein Limit für die Textlänge?

- **Praktisches Limit**: ~100.000 Zeichen für optimale Performance
- **Technisches Limit**: Abhängig von Ihrem Browser-Speicher
- **Empfehlung**: Teilen Sie sehr lange Texte auf mehrere Cases auf

### ❓ Unterstützt die Anwendung mehrere Sprachen?

Die KI-Erkennung funktioniert am besten mit **deutschen und englischen** Texten. Andere Sprachen können schlechtere Ergebnisse liefern. Die Benutzeroberfläche ist aktuell nur auf **Deutsch** verfügbar.

### ❓ Was bedeutet "GLiNER" und "ONNX"?

- **GLiNER**: "Generalist and Lightweight Named Entity Recognition" - das KI-Modell zur Entitätserkennung
- **ONNX**: "Open Neural Network Exchange" - das Format, in dem das Modell ausgeführt wird (ermöglicht Ausführung im Browser)

---

## Tastaturkürzel

| Tastenkombination | Aktion |
|-------------------|--------|
| **Ctrl + V** | Text einfügen (wenn erlaubt) |
| **Ctrl + C** | Nach Klick auf "Kopieren"-Button |
| **Ctrl + A** | Gesamten Text im Eingabe-/Ausgabefeld markieren |
| **Tab** | Zwischen Eingabe- und Ausgabefeld wechseln |
| **Esc** | Modals schließen |

---

## Technische Informationen

### System-Anforderungen

**Browser:**
- Chrome 90+ (empfohlen)
- Edge 90+
- Firefox 88+
- Safari 14+ (eingeschränkter Support)

**Hardware:**
- **RAM**: Mindestens 4 GB (empfohlen 8 GB)
- **Speicherplatz**: ~1.5 GB für Modelle und Cache
- **Prozessor**: Moderner Multi-Core-Prozessor empfohlen

**Internetverbindung:**
- Erforderlich für ersten Modell-Download (~1 GB)
- Optional für Google Gemini API (Quick Infer)
- Danach komplett offline nutzbar

### Verwendete Technologien

- **Frontend**: Vue 3, Tailwind CSS, DaisyUI
- **KI-Modell**: GLiNER (ONNX Runtime)
- **Datei-Verarbeitung**: PDF.js, Mammoth.js
- **Speicher**: IndexedDB, localStorage
- **APIs**: Web Crypto API, Notification API, Google Gemini API (optional)

---

## Support und Weitere Informationen

**Entwickelt von:**
- Basierend auf der Arbeit von [recht.intelligent](https://www.recht-intelligent.ch) / [iusable.ai](https://iusable.ai)

**Bei Problemen:**
1. Prüfen Sie die Browser-Konsole (F12) auf Fehlermeldungen
2. Leeren Sie den Browser-Cache und laden Sie die Seite neu
3. Stellen Sie sicher, dass Ihr Browser aktuell ist
4. Kontaktieren Sie Ihren Administrator

---

**Version:** 1.0
**Stand:** November 2024
**Lizenz:** Siehe Lizenz-Informationen in den Einstellungen

---

*Diese Anleitung wird regelmäßig aktualisiert. Letzte Aktualisierung: 14.11.2024*
