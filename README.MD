# InjectJS

**InjectJS** is a lightweight (~180 lines) utility that modularizes your web content without a CMS. It injects external HTML, CSS, and JavaScript files directly into your pages, making projects easier to maintain, more organized, and more reusable.  

InjectJS uses the native **`XMLHttpRequest()`** function to fetch and insert content. This means it works cleanly across all server technologies and avoids any CORS issues.

---

## Key Features
- **Modular content loading** — pull in external `.html` files and inject them where needed.  
- **Separation of concerns** — keep `<head>`, `<css>`, and `<script>` elements in dedicated files.  
- **Lightweight** — pure vanilla JavaScript (~180 lines).  
- **Server-agnostic** — no special setup required; bypasses CORS restrictions.  
- **Reusable** — works with any HTML structure you define.  

---

## Basic Usage

```html
<!-- home.html -->
<head>
  <script type="module" src="js/inject.js"></script>
  <in-ject src="components/default_head.html"></in-ject>
</head>

<!-- default_head.html -->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="css/default.css">
  <!-- more head elements... -->
</head>
```
The ```<in-ject>``` tag replaces itself with the file you specify (default_head.html here).