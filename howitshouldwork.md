The user adds an index.html and a flash.yaml, and the index.html looks like:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="scripts/script.js"></script>
    </head>
    <body>
        
    </flash>

    </body>
</html>
```

and the flash.yaml can have sections such as Backgound color, Background Image, sections with text/images, cursor effects and such.

and each section in the yaml will correspond to a BIT in the /bits section on the repository.

So

```yaml
background:
  color: "#000"

section:
    text:
        content: "Hi"
        color: "#FFFFF"
        style:
            bold: true
            align:
            horizontal: center
            vertical: middle
```

would be a simple html page that has a background with white text and a black background