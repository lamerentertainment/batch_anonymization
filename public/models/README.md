# Keine Modelldateien hier

Das GLiNER-Modell wird nicht mehr mit der App ausgeliefert. Die App lädt es im Browser direkt von
Hugging Face, mit fester Revision und SHA-256-Prüfung (siehe `models/catalog.json` und
`src/models/modelStore.js`). Der Build bricht ab, wenn hier noch `gliner_multi_pii-v1/` liegt.
