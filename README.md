# SubGrid

A simple tool to visualize your subscription costs. See where your money goes each month through an interactive treemap.

## What it does

- Track your subscriptions (Netflix, Spotify, etc.)
- View costs as a proportional grid so you can see which services eat up your budget
- Import subscriptions from bank statements (CSV)
- Import subscriptions from YNAB using Personal Access Token
- Export your visualization as an image
- Supports 38+ currencies

## How to use

Serve the files with any static server:

```
npx serve .
```

or

```
python -m http.server
```

Your data stays in your browser's local storage.

## Import from YNAB

SubGrid can automatically detect subscriptions from your YNAB (You Need A Budget) transactions.

### How to use:

1. **Get your Personal Access Token:**
   - Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
   - Click "New Token"
   - Copy the token

2. **Import to SubGrid:**
   - Click "Import from YNAB" on the main screen
   - Paste your token
   - Select your budget
   - (Optional) Select specific categories to filter
   - Review detected subscriptions
   - Add selected subscriptions to SubGrid

### Privacy & Security:

- Your token is only stored locally in your browser (if you choose to save it)
- No data is sent to any server except YNAB's official API
- You can revoke the token anytime in YNAB settings

## Stack

Plain HTML, CSS, and JavaScript. Uses Tailwind CSS for styling.

## License

MIT
