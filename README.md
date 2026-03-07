# lokale Anonymisierung

Ein leistungsstarkes, datenschutzorientiertes Werkzeug zur automatisierten und interaktiven Anonymisierung von Textdokumenten. Entwickelt für Anwendungsfälle, bei denen **Personally Identifiable Information (PII)** zuverlässig erkannt und durch Platzhalter ersetzt werden muss.

testen auf: http://batch-anon.einfuegen.ch

## 🛡️ Datenschutz & Sicherheit

Der Schutz Ihrer Daten steht an erster Stelle. Im Gegensatz zu vielen anderen KI-Tools arbeitet diese Anwendung nach dem **Local-First-Prinzip**:

- **Kein Datentransfer**: Ihre Dokumente werden niemals auf einen Server hochgeladen.
- **Lokale Verarbeitung**: Die KI-Modelle (GLiNER) laufen direkt in Ihrem Browser mittels ONNX Runtime (WebGPU/WASM).
- **Offline-Fähigkeit**: Nach dem initialen Laden des Modells kann die Anwendung vollständig offline genutzt werden.

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

## ️ Installation & Setup

```bash
# Abhängigkeiten installieren und PDF-Worker einrichten
npm install

# Entwicklungsserver starten
npm run dev

# Produktions-Build erstellen
npm run build
```

### ⚠️ Wichtiger Hinweis zum PDF-Worker & Modellen
Sie müssen die Modelle und den PDF.js-Worker manuell zum Projekt hinzufügen (oder den Setup-Script nutzen). Siehe `Readme.md` im Ordner `/public` für genaue Anweisungen.

```bash
# Manueller Setup des PDF-Workers (falls nötig)
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```

### Important
You need to add the models and the pdfjs worker to the project manually. See Readme.md in /public for precise instructions.

### Server Configuration

#### ONNX Model Caching (.htaccess)
To improve performance and prevent redownloading models on each visit, add proper cache headers for ONNX files:

```apache
# Cache ONNX model files for 1 year
<FilesMatch "\.(onnx)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, max-age=31536000"
</FilesMatch>

# Cache WASM files for 1 year
<FilesMatch "\.(wasm)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, max-age=31536000"
</FilesMatch>

# Cache tokenizer files for 1 year
<FilesMatch "\.(json|txt)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, max-age=31536000"
</FilesMatch>
```

#### PDF.js Worker MIME Type (.htaccess)
When deploying to production, you may encounter MIME type errors with the PDF.js worker file (`pdf.worker.min.mjs`). The server must serve `.mjs` files with the correct MIME type for ES6 module loading.

Add this to your `.htaccess` file in the web root:

```apache
# Fix MIME type for .mjs files (ES6 modules)
AddType application/javascript .mjs

# Alternative approach if the above doesn't work
<FilesMatch "\.mjs$">
    ForceType application/javascript
</FilesMatch>

# Or use text/javascript (also acceptable)
# AddType text/javascript .mjs
```

#### Nginx
Add this to your Nginx server configuration:

```nginx
location ~* \.mjs$ {
    add_header Content-Type application/javascript;
}

# Or in the http block:
# http {
#     include /etc/nginx/mime.types;
#     types {
#         application/javascript mjs;
#     }
# }
```

#### Express.js / Node.js
If using Express.js, add this middleware:

```javascript
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
```

#### Firebase Hosting
For Firebase Hosting deployments, the application automatically uses intelligent fallback logic:
- **First**: Tries to load the PDF.js worker from a local file (offline mode)
- **Fallback**: Uses CDN if local file is not available

The `firebase.json` file already includes the necessary MIME type configuration for `.mjs` files:

```json
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "**/*.mjs",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/javascript"
          }
        ]
      }
    ]
  }
}
```

**For complete offline functionality (recommended for privacy/security):**

1. Run the setup script after installing dependencies:
   ```bash
   npm install
   npm run setup
   ```

   The `postinstall` script automatically copies the PDF.js worker to `public/`, enabling offline mode.

2. The Service Worker automatically caches the `.mjs` file for persistent offline access.

**Manual setup (if npm install fails):**
   ```bash
   cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
   ```

The application will detect the local worker file and use it automatically. Check the browser console for confirmation:
- ✅ "Using local PDF.js worker (offline mode)" - Fully offline
- ⚠️ "Local PDF.js worker not found, using CDN fallback" - Requires internet

#### Vite Development Server
For development, the Vite config should handle this automatically, but if issues persist, you can add:

```javascript
// vite.config.js
export default defineConfig({
  server: {
    middlewareMode: false,
    configure: (app) => {
      app.use((req, res, next) => {
        if (req.url.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
        next();
      });
    }
  }
});
```

The error occurs because browsers require ES6 modules (`.mjs` files) to be served with `application/javascript` or `text/javascript` MIME type, not `text/plain`.

### Project Setup

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Dependencies and Licenses

### Runtime Dependencies
- **Vue** (^3.4.21) - MIT License - Progressive JavaScript framework
- **Gliner** (^0.0.19) - Apache-2.0 License - Named Entity Recognition library
- **@huggingface/transformers** (^3.5.1) - Apache-2.0 License - Machine learning transformers library
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
