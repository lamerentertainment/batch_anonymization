# Firebase Hosting verwalten (batch-anon)

Kurzanleitung zum Deaktivieren (Abschalten) und Reaktivieren (Anschalten/Deployen) der Firebase-Hosting-Instanz für dieses Projekt.

---

## Projekt-Info

* **Firebase Projekt-ID:** `batch-anon` (definiert in [.firebaserc](file:///Users/jonasachermann/repos/batch_anonymization/.firebaserc))
* **Hosting-Konfiguration:** [firebase.json](file:///Users/jonasachermann/repos/batch_anonymization/firebase.json)

---

## 1. Hosting abschalten (Deaktivieren)

### Per Terminal (CLI) – *Empfohlen*
Im Projektverzeichnis folgenden Befehl ausführen:

```bash
firebase hosting:disable
```

* Die Sicherheitsabfrage mit **`y` / `Yes`** bestätigen.
* Die Seite wird danach sofort unzugänglich und liefert den Standard-Hinweis ("Site Not Found").
* Ohne Bestätigungsabfrage (z. B. für Skripte):
  ```bash
  firebase hosting:disable -f
  ```

### Über die Firebase Web-Konsole
1. [Firebase Console](https://console.firebase.google.com/) öffnen.
2. Projekt **`batch-anon`** auswählen.
3. Im linken Menü unter **Build** auf **Hosting** navigieren.
4. Auf das Drei-Punkte-Menü (**⋮**) bei der Domain bzw. im Dashboard klicken.
5. **"Hosting deaktivieren"** (*Disable site*) auswählen und bestätigen.

---

## 2. Hosting wieder anschalten (Reaktivieren / Deployen)

Um die Seite wieder live zu schalten, muss ein neuer Build erstellt und auf Firebase Hosting hochgeladen werden. Durch das Deployment wird die Seite automatisch wieder aktiv.

### Per Terminal (CLI)

1. **Abhängigkeiten sicherstellen (falls nötig):**
   ```bash
   npm install
   ```
   Das Modell wird nicht mit der Website ausgeliefert; die Nutzer laden es im Browser direkt von Hugging Face.

2. **Produktions-Build erstellen:**
   ```bash
   npm run build
   ```

3. **Auf Firebase Hosting bereitstellen:**
   ```bash
   firebase deploy --only hosting
   ```

Sobald das Deployment abgeschlossen ist, ist die Website unter der entsprechenden Firebase-URL wieder erreichbar.

---

## Häufige Fehler & Tipps

* **Nicht eingeloggt bei Firebase?**
  ```bash
  firebase login
  ```
* **Falsches Projekt aktiv?**
  ```bash
  firebase use batch-anon
  ```
