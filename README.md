# Korean Learning App

## De website lokaal openen

De app bestaat uit een React-frontend, een Laravel-API en Ollama voor de AI-functies. Start ze alle drie lokaal om de hele website te gebruiken.

### Eenmalig instellen

Benodigd: PHP 8.2+, Composer, Node.js/npm en Ollama.

Open PowerShell in de projectmap en voer uit:

```powershell
cd backend
composer install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
php artisan migrate
```

Installeer daarna de frontend-dependencies:

```powershell
cd ..\frontend
npm install
```

De vertaalfunctie gebruikt TranslateGemma 4B. De functies voor zinnen genereren en beoordelen blijven `neural-chat` gebruiken. Download beide modellen eenmalig:

```powershell
ollama pull translategemma:4b
ollama pull neural-chat
```

De backend-instellingen voor Ollama staan in `backend/.env`. Standaard gebruikt de app `http://localhost:11434`, `translategemma:4b` voor vertalingen en `neural-chat` voor de zinnenfuncties. Pas hiervoor `OLLAMA_BASE_URL`, `OLLAMA_TRANSLATION_MODEL` of `OLLAMA_MODEL` in `backend/.env` aan als je andere instellingen wilt gebruiken. De vertaalfunctie toont de Koreaanse vertaling; romanisatie en gebruiksnotities worden niet meer door het vertaalmodel geleverd.

### Starten

Start Laravel in een PowerShell-venster:

```powershell
cd backend
php artisan serve
```

Start Vite in een tweede PowerShell-venster:

```powershell
cd frontend
npm run dev
```

Start Ollama als de Ollama-app/service nog niet actief is:

```powershell
ollama serve
```

Open vervolgens de Vite-URL die in het frontend-venster wordt getoond; meestal is dat **http://localhost:5173**. Laat de terminalvensters open terwijl je de website gebruikt.

De frontend roept de Laravel-API aan op **http://localhost:8000**. Wanneer vertalen of de AI-oefeningen niet werken, controleer dan of Laravel en Ollama draaien en of de benodigde modellen beschikbaar zijn.

## De gebouwde website openen via Laravel

Je kunt ook eerst een statische frontend-build maken en deze via Laravel serveren:

```powershell
cd frontend
npm run build
cd ..\backend
php artisan serve
```

Open dan **http://localhost:8000**. Voer `npm run build` opnieuw uit nadat je frontend-code hebt aangepast, zodat de gebouwde website wordt bijgewerkt.
