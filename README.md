# Metaplex with HTML Candymachine 

Check my last commit to see everything I changed to make this happen

Your NFT config JSON files need to look like this

```json
{
  "name": "HTML_FILE",
  "symbol": "",
  "animation_url": "0.html",
  "properties": {
    "category": "html",
    "files": [
      {
        "uri": "0.html",
        "type": "text/html"
      }
    ],
    "creators": [
      {
        "address": "YOUR ADDRESS",
        "share": 100
      }
    ]
  }
}
```