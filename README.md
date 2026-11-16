# lokale Anonymisierung

Ein leistungsstarkes, datenschutzorientiertes Werkzeug zur automatisierten und interaktiven Anonymisierung von Textdokumenten. Entwickelt für Anwendungsfälle, bei denen **Personally Identifiable Information (PII)** zuverlässig erkannt und durch Platzhalter ersetzt werden muss.

testen auf: http://batch-anon.einfuegen.ch

## 🛡️ Datenschutz & Sicherheit

Ihre Dokumente verlassen den Browser nie. Die Erkennung (GLiNER) läuft lokal mit der ONNX Runtime
(WebGPU, sonst WebAssembly).

### Wann die App ins Internet geht

| Modus | Netzwerk | Wofür |
|---|---|---|
| **Lokal** (Standard, nach jedem Start) | keine einzige Anfrage | Anonymisieren |
| **Verbunden** (nur auf Knopfdruck, endet automatisch) | nur Abrufe, nur zu dieser Website und zu Hugging Face | App-Update, Modell laden |

- **Torwächter** ([`public/sw.js`](public/sw.js)): Ein Service Worker beantwortet jede Anfrage aus dem
  Browser-Speicher oder entscheidet nach den Regeln in [`public/sw-policy.js`](public/sw-policy.js).
  Im Modus Lokal wird alles blockiert, im Modus Verbunden sind nur `GET`-Abrufe zu freigegebenen Zielen erlaubt.
- **Content Security Policy** ([`csp.js`](csp.js)): Der Browser verbietet Verbindungen zu allen anderen
  Servern, unabhängig vom Code der App. Kein CDN: ONNX Runtime und pdf.js-Worker kommen aus `/vendor`.
- **Verbindungsprotokoll**: Jede Netzwerkanfrage, ob erlaubt oder blockiert, erscheint unter *Internetverbindung*.
- **Updates nur auf Wunsch**: Die App sucht nicht selbst nach Updates. Eine neue Version, die der Browser
  von sich aus findet, wird verworfen und protokolliert.
- **Modell direkt von Hugging Face** ([`models/catalog.json`](models/catalog.json)):
  [`onnx-community/gliner_multi_pii-v1`](https://huggingface.co/onnx-community/gliner_multi_pii-v1)
  (Apache-2.0, Basis [`urchade/gliner_multi_pii-v1`](https://huggingface.co/urchade/gliner_multi_pii-v1))
  mit fester Revision, Grösse und SHA-256 jeder Datei (festgelegt mit
  [`scripts/models/pin-gliner.mjs`](scripts/models/pin-gliner.mjs)). Die Prüfsumme wird beim Herunterladen
  laufend berechnet; stimmt sie nicht, wird die Datei verworfen. Der Website-Server liefert kein Modell aus.
- **Tokenizer ohne Netz** ([`src/worker/worker.js`](src/worker/worker.js)): transformers.js erhält einen
  eigenen Cache, der nur aus dem geprüften Modellspeicher liest.

Grenzen: Der Browser prüft `sw.js` gelegentlich von sich aus (höchstens etwa einmal pro Tag; eine so
gefundene Version wird nicht installiert). Ein erzwungenes Neuladen (Shift + Neu laden) umgeht den Service
Worker für diesen einen Aufruf. Der erste Besuch lädt die App naturgemäss aus dem Netz.

## ✨ Kernfunktionen

### 1. Intelligente Entitätserkennung (KI-gestützt)
Nutzt modernste **GLiNER (Generalist Model for Information Extraction)** Technologie zur Erkennung von über 60 Kategorien sensibler Daten:
- **Personen**: Namen, Initialen, Titel.
- **Adressen & Orte**: Strassen, Städte, Länder, Postleitzahlen.
- **Organisationen**: Firmennamen, Behörden, Vereine.
- **Finanzdaten**: IBAN, Kreditkartennummern.
- **Identifikatoren**: Sozialversicherungsnummern, Steuernummern, Pass- und Ausweisnummern.
- **Fahrzeugdaten**: Autokennzeichen, Fahrzeugmarken.
- **Kontakt**: E-Mail-Adressen, Telefonnummern (Festnetz & Mobil).

### 2. Anonymisierungsvarianten
- **Gerichtsüblicher Stil**: Automatische Umwandlung in das Format `A.________` (mit konsistenter Identifikations-Zuweisung).
- **Token-basiert**: Ersetzung durch Platzhalter wie `[1_PERSON]`, `[2_LOCATION]`, etc.
- **Teilwort-Anonymisierung**: Optionale Behandlung von Entitätsbestandteilen (z. B. "Max" aus "Max Mustermann").

### 3. Workflow & Bearbeitung
- **Batch-Modus**: Verarbeitung ganzer Ordner oder mehrerer Dateien gleichzeitig.
- **Interaktive Vorschau**: Echtzeit-Vorschau mit farblichen Hervorhebungen und Hover-Funktion (Originaltext wird bei Mouse-over angezeigt).
- **Manuelle Korrekturen**: Zusätzliche Entitäten einfach durch Markieren im Text definieren.
- **Entitäts-Merge**: Zusammenführen verschiedener Textvarianten (z. B. "Max Mustermann" und "M. Mustermann") zu einem einzigen Platzhalter.
- **Negativliste (Exclusion List)**: Definieren von Wörtern, die niemals anonymisiert werden sollen (z. B. Ortsnamen in spezifischen Kontexten).

### 4. Datei-Handling
- **Unterstützte Formate**: `.txt`, `.pdf`, `.docx` (Word).
- **Markdown-Export**: Konvertiert Word-Dokumente in Markdown, um Formatierungen (Fett, Listen) bei gleichzeitiger Textbasiertheit beizubehalten.
- **Dateinamen-Anonymisierung**: Option zur automatischen Generierung neutraler Dateinamen (`anon-text-########`).

## Entwicklung

```bash
npm install
npm run dev       # Entwicklungsserver (ohne Torwächter)
npm test          # Regeln des Torwächters, CSP und Modellkatalog
npm run build && npm run preview   # mit Torwächter, wie in Produktion
```

`scripts/copy-vendor.js` kopiert vor `dev` und `build` die ONNX Runtime (Version von gliner) und den
pdf.js-Worker nach `public/vendor/`. Modelldateien gehören nicht mehr nach `public/`: Der Build bricht ab,
wenn noch ein Ordner `public/models/gliner_multi_pii-v1` vorhanden ist.

Neue Modellrevision festlegen: `node scripts/models/pin-gliner.mjs [revision]`.

## Dependencies and Licenses

### Runtime Dependencies
- **Vue** (^3.4.21) - MIT License - Progressive JavaScript framework
- **Gliner** (^0.0.19) - Apache-2.0 License - Named Entity Recognition library
- **@xenova/transformers** (2.17.2, über gliner) - Apache-2.0 License - Tokenizer
- **@noble/hashes** (2.4.0) - MIT License - SHA-256 im Datenstrom
- **pdfjs-dist** (^5.2.133) - Apache-2.0 License - PDF parsing and rendering
- **mammoth** (^1.9.0) - BSD-2-Clause License - DOCX to HTML converter
- **@heroicons/vue** (^2.1.5) - MIT License - SVG icon library

### Development Dependencies
- **Vite** (^5.2.0) - MIT License - Build tool and development server
- **@vitejs/plugin-vue** (^5.0.4) - MIT License - Vue plugin for Vite
- **Tailwind CSS** (^3.4.4) - MIT License - Utility-first CSS framework
- **DaisyUI** (^4.12.2) - MIT License - Tailwind CSS component library
- **PostCSS** (^8.4.38) - MIT License - CSS post-processor
- **Autoprefixer** (^10.4.19) - MIT License - CSS vendor prefix automation

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (previously Volar) and disable Vetur
