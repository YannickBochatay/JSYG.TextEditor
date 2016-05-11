# JSYG.TextEditor
svg text editor (JSYG framework)

### Demo
[http://yannickbochatay.github.io/JSYG.TextEditor/](http://yannickbochatay.github.io/JSYG.TextEditor/)

### Installation
```shell
npm install jsyg-texteditor
```

### Example with webpack/babel
```javascript
import TextEditor from "jsyg-texteditor"
import $ from "jquery"

let editor = new TextEditor('#mySVGContainer')
           
$('#mySVGContainer').on("click",function(e) {

  if ( e.target.tagName == "text") {
    editor.target(e.target)
    editor.show()
  }
})
```