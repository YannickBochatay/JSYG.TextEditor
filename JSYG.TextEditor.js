/*jshint forin:false, eqnull:true*/
/* globals JSYG*/

(function(factory) {
    
    if (typeof module == "object" && typeof module.exports == "object") {
      
      module.exports = factory( require("jsyg"), require("jsyg-color"), require("jsyg-boundingbox") )
    }
    else if (typeof define != "undefined" && define.amd) {
      
      define("jsyg-texteditor",["jsyg","jsyg-color","jsyg-boundingbox"],factory);
    }
    else if (typeof JSYG != "undefined") {
      
        if (JSYG.BoundingBox && JSYG.Color) factory(JSYG,JSYG.Color,JSYG.BoundingBox);
        else throw new Error("Dependency is missing");
    }
    else throw new Error("JSYG is needed");
    
})(function(JSYG,Color,BoundingBox) {
    
    "use strict";
    
    function TextEditor(arg,opt) {
        
        this.box = new BoundingBox();
        this.box.className = 'textBox';
        
        this.container = this.box.container;
        
        this.selection = new Selection(this);
        this.cursor = new Cursor(this);
        this.keyboard = new Keyboard(this);
        
        if (arg) this.setNode(arg);
        if (opt) this.enable(opt);
    }
    
    TextEditor.prototype = new JSYG.StdConstruct();
    
    TextEditor.prototype._target = null;
    
    /**
     * Fonctions à exécuter quand on définit une autre cible
     */
    TextEditor.prototype.onchangetarget = null;
    /**
     * Fonctions à exécuter à l'affichage de la boîte d'édition
     */
    TextEditor.prototype.onshow=null;
    /**
     * Fonctions à exécuter à la suppression de la boîte d'édition
     */
    TextEditor.prototype.onhide=null;
    /**
     * Fonctions à exécuter à la suppression de caractères
     */
    TextEditor.prototype.ondeletechars=null;
    /**
     * Fonctions à exécuter à l'ajout de caractères
     */
    TextEditor.prototype.oninsertchars=null;
    /**
     * Fonctions à exécuter à la mise à jour de la boîte d'édition
     */
    TextEditor.prototype.onupdate=null;
    /**
     * Fonctions à exécuter à l'ajout ou suppression de caractères
     */
    TextEditor.prototype.onchange=null;
    /**
     * Fonctions à exécuter à la validation de la boîte d'édition (seulement si le texte a changé)
     */
    TextEditor.prototype.onvalidate=null;
    
    TextEditor.prototype.className = "textEditor";
    
    TextEditor.prototype._content = null;
    
    TextEditor.prototype.enabled = false;
    
    TextEditor.prototype.target = function(arg) {
        
        if (arg == null) return this._target ? new JSYG(this._target) : null;
        
        var target = new JSYG(arg)[0];
        
        if (target.tagName != 'text') throw new Error("La cible n'est pas un élément texte");
        
        var display = this.display;
        
        if (display) this.hide(true);
        
        this._target = target;
        this.box.setNode(target);
        
        if (display) this.show(true);
        
        this.trigger('changetarget',this.node,target);
        
        return this;
    };
    
    TextEditor.prototype.targetRemove = function() {
        
        this._target = null;
    };
    
    TextEditor.prototype.insertChars = function(chars,indChar) {
        
        if (indChar < 0 || indChar > this._target.getNumberOfChars()) return false;
        
        chars = chars.replace(/ /g,'\u00a0');
        
        var content = this._target.textContent;
        
        this._target.textContent = content.substr(0,indChar) + chars + content.substr(indChar);
        
        this.box.update();
        
        this.trigger('insertchars',this.node,this._target);
        this.trigger('change',this.node,this._target);
        
        return this;
    };
    
    TextEditor.prototype.deleteChars = function(indChar,nbChars) {
        
        nbChars = nbChars || 1;
        
        if (indChar < 0 || indChar > this._target.getNumberOfChars()) return false;
        
        var content = this._target.textContent;
        
        this._target.textContent = content.substr(0,indChar) + content.substr(indChar+nbChars);
        
        this.box.update();
        
        this.trigger('deletechars',this.node,this._target);
        this.trigger('change',this.node,this._target);
        
        return this;
    };
    
    TextEditor.prototype.getCharFromPos = function(e) {
        
        var pt = new JSYG(this._target).getCursorPos(e);
        return this._target.getCharNumAtPosition(pt.toSVGPoint());
    };
    
    TextEditor.prototype.show = function(_preventEvent) {
        
        if (!this._target) return this;
        
        if (this.display) return this.update();
        
        this.box.show();
        
        this.selection.enable();
        this.keyboard.enable();
        
        this.cursor.enable().show( this._target.getNumberOfChars() );
        
        this.display = true;
        
        this._content = this._target.textContent;
        
        if (!_preventEvent) this.trigger('show',this.node,this._target);
        
        return this;
    };
    
    TextEditor.prototype.hide = function(_preventEvent) {
        
        if (!this.display) return this;
        
        this.selection.disable();
        this.cursor.disable();
        this.keyboard.disable();
        
        new JSYG(this.container)
            .removeClass(this.className)
            .resetTransf().detach();
        
        this.display = false;
        
        if (this._target.textContent != this._content) this.trigger('validate',this.node,this._target);
        
        if (!_preventEvent) this.trigger('hide',this.node,this._target);
        
        return this;
    };
    
    TextEditor.prototype.update = function() {
        
        if (!this.display) return this;
        
        this.box.update();
        
        if (this.selection.display) this.selection.select(this.selection.from,this.selection.to);
        if (this.cursor.display) this.cursor.show(this.cursor.currentChar);
        
        this.trigger('update',this.node,this._target);
        
        return this;
    };
    
    
    function Selection(textObject) {
        /**
         * référence vers l'objet TextEditor parent
         */
        this.textEditor = textObject;
        /**
         * Conteneur des controles
         */
        this.container = new JSYG('<rect>')[0];
    }
    
    Selection.prototype = new JSYG.StdConstruct();
    
    Selection.prototype.className = "textSelection";
    
    Selection.prototype.display = false;
    
    Selection.prototype.from = null;
    
    Selection.prototype.to = null;
    
    Selection.prototype.enabled = false;
    
    Selection.prototype.hide = function() {
        
        this.from = null;
        this.to = null;
        
        new JSYG(this.container).detach();
        
        this.display = false;
        
        return this;
    };
    
    Selection.prototype.deleteChars = function() {
	
        if (this.from === this.to) { return; }
        
        this.textEditor.deleteChars(this.from,this.to-this.from);
        
        this.to = this.from;
        
        this.textEditor.cursor.goTo(this.to);
        
        this.hide();
        
        return this;
    };
    
    function getFontSize(node) {
	
        var size = new JSYG(node).css("font-size");
        
        if (/px/.test(size)) return parseFloat(size);
        else if (/pt/.test(size)) return parseFloat(size) * 1.33;
        else throw new Error(size+" : valeur incorrecte");
    }
    
    Selection.prototype.select = function(from,to) {
        
        if (from === to) return this.hide();
        
        this.textEditor.cursor.hide();
        
        var node = this.textEditor._target;
        var nbchars = node.getNumberOfChars();
        
        from = JSYG.clip(from,0,nbchars);
        to = JSYG.clip(to,0,nbchars);
        
        var jCont = new JSYG(this.container).addClass(this.className);
        var jNode = new JSYG(node);
        
        if (!this.container.parentNode) jCont.appendTo(this.textEditor.container);
        
        jCont.fill( new Color( jNode.css("fill") ).complementary().toString() );
        
        jCont.setMtx( jNode.getMtx(this.textEditor.container) );
        
        var fontsize = getFontSize(node);
        var start,end;
        
        if (from === nbchars) { //positionnement tout à la fin
            start = node.getEndPositionOfChar(from-1);
        }
        else { start = node.getStartPositionOfChar(from); }
        
        if (to === nbchars) { //positionnement tout à la fin
            end = node.getEndPositionOfChar(to-1);
        }
        else { end = node.getStartPositionOfChar(to); }
        
        jCont.setDim({
            x: start.x < end.x ? start.x : end.x,
            y:start.y-fontsize+3,
            width:Math.abs(end.x-start.x),
            height:fontsize
        });
        
        this.from = Math.min(from,to);
        this.to = Math.max(from,to);
        
        this.textEditor.cursor.currentChar = this.to;
        
        this.display = true;
        
        return this;
    };
    
    Selection.prototype.start = function(e) {
        
        var node = this.textEditor._target;
        
        if (!node || node.tagName != "text") return this.hide();
        
        var jNode = new JSYG(node),
        pt = jNode.getCursorPos(e),
        ind = this.textEditor.getCharFromPos(e),
        pt1,pt2,
        that = this,
        from,to;
        
        if (ind == -1) return this.textEditor.hide();
        
        this.hide();
        
        pt1 = node.getStartPositionOfChar(ind);
        pt2 = node.getEndPositionOfChar(ind);
        
        if (pt2.x - pt.x < pt.x - pt1.x) ind++;
        
        from = ind;
        to = ind;
        
        function mousemove(e) {
            
            var pt = jNode.getCursorPos(e),
            ind = that.textEditor.getCharFromPos(e),
            pt1,pt2;
            
            if (ind === -1) return;
            
            pt1 = node.getStartPositionOfChar(ind);
            pt2 = node.getEndPositionOfChar(ind);
            
            if (pt2.x - pt.x < pt.x - pt1.x) ind++;
            
            to = ind;
            
            that.select(from,to);
        }
        
        function remove() {
            new JSYG(that.textEditor.container).off({
                "mousemove":mousemove,
                "mouseup":remove
            });
        }
        
        new JSYG(this.textEditor.container).on({
            "mousemove":mousemove,
            "mouseup":remove
        });
        
        return this;
    };
    
    Selection.prototype.selectWord = function(ind) {
	
        this.textEditor.cursor.goTo(ind);
        var word = this.textEditor.cursor.getCurrentWord();
        this.select(word.start,word.end);
    };
    
    Selection.prototype.dblclick = function(e) {
	
        var node = this.textEditor._target;
        if (!node || node.tagName != 'text') return this.hide();
        
        e.preventDefault();
        
        var ind = this.textEditor.getCharFromPos(e);
        
        this.selectWord(ind);
    };
    
    Selection.prototype.enable = function(opt) {
        
        this.disable();
        
        if (opt) { this.set(opt); }
        
        var that = this;
        
        function start(e) {
            
            if (e.which != 1) return;
            
            e.preventDefault();
            
            that.start(e);
        }
        
        function dblclick(e) {
            
            if (e.which != 1) return;
            
            e.preventDefault();
            
            that.dblclick(e);
        }
        
        new JSYG(this.textEditor.container).on("mousedown",start);
        new JSYG(this.textEditor.container).on("dblclick",dblclick);
        
        this.disable = function() {
            this.hide();
            new JSYG(this.textEditor.container).off("mousedown",start);
            new JSYG(this.textEditor.container).off("dblclick",dblclick);
            this.enabled = false;
            return this;
        };
        
        this.enabled = true;
        
        return this;
    };
    
    Selection.prototype.disable = function() { return this; };
    
    
    function Cursor(textObject) {
        /**
         * référence vers l'objet TextEditor parent
         */
        this.textEditor = textObject;
        
        this.container = new JSYG('<line>')[0];
    }
    
    Cursor.prototype = new JSYG.StdConstruct();
    
    Cursor.prototype.enabled = false;
    
    Cursor.prototype.display = false;
    
    Cursor.prototype.currentChar = -1;
    
    Cursor.prototype.className = 'cursor';
    
    Cursor.prototype._interval = false;
    
    Cursor.prototype.goTo = function(indice) {
        return this.show(indice); 
    };
    
    Cursor.prototype.setFromPos = function(e) {
        return this.show( this.textEditor.getCharFromPos(e) ); 
    };
    
    Cursor.prototype.firstChar = function() {
        return this.goTo(0);
    };
    
    Cursor.prototype.lastChar = function() {
        return this.goTo( this.textEditor._target.getNumberOfChars() );
    };
    
    Cursor.prototype.nextChar = function() {
        return this.goTo(this.currentChar + 1);
    };
    
    Cursor.prototype.prevChar = function() {
        return this.goTo(this.currentChar - 1);
    };
    
    Cursor.prototype.insertChar = function(letter) {
        this.textEditor.insertChars(letter,this.currentChar);
        this.nextChar();
    };
    
    Cursor.prototype.deleteChar = function() {
        this.textEditor.deleteChars(this.currentChar);
        this.goTo(this.currentChar);
    };
    
    Cursor.prototype.getCurrentWord = function() {
	
        if (this.currentChar === -1) { return; }
        
        var str = this.textEditor._target.textContent,
        start = str.substr(0,this.currentChar).replace(/\w+$/,'').length,
        match = str.substr(this.currentChar).match(/^\w+/) || [[]],
        end = match[0].length + this.currentChar;
        
        return { start : start, end : end, content : str.substring(start,end) };
    };
    
    Cursor.prototype.show = function(indice) {
        
        var node = this.textEditor._target;
        
        if (indice < 0 || indice > node.getNumberOfChars()) { return false; }
        
        var pt,
        jNode = new JSYG(node),
        nbchars = node.getNumberOfChars(),
        fontsize = getFontSize(node),
        color = jNode.fill(),
        jCont = new JSYG(this.container);
        
        if (color == "none") color = "black";
        
        if (nbchars === 0) {
            pt = new JSYG.Vect(jNode.attr("x"),jNode.attr("y"));
        }
        else if (indice === nbchars) { //positionnement tout à la fin
            pt = node.getEndPositionOfChar(indice-1);
        }
        else pt = node.getStartPositionOfChar(indice);
        
        this.hide();
        
        jCont.attr({
            x1:pt.x , y1: pt.y + 3,
            x2:pt.x , y2: pt.y + 3 - fontsize
        })
            .css('visibility','visible')
            .css('stroke',color)
            .addClass(this.className)
            .setMtx( jNode.getMtx(this.textEditor.container) )
            .appendTo(this.textEditor.container);
        
        this.interval = window.setInterval(function() {
            jCont.css( 'visibility', jCont.css('visibility') === 'visible' ? 'hidden' : 'visible' ); 
        },600);
        
        this.currentChar = indice;
        this.textEditor.selection.from = indice;
        this.textEditor.selection.to = indice;
        
        this.display = true;
        
        return this;
    };
    
    Cursor.prototype.hide = function() {
	
        window.clearInterval(this.interval);
        
        new JSYG(this.container).detach();
        
        this.display =  false;
        
        return this;
    };
    
    Cursor.prototype._mousedown = function(e) {
        
        if (e.which != 1) return this;
        
        var node = this.textEditor._target,
        pt = new JSYG(node).getCursorPos(e),
        ind = this.textEditor.getCharFromPos(e),
        pt1,pt2;
        
        if (ind===-1) return this;
        
        pt1 = node.getStartPositionOfChar(ind);
        pt2 = node.getEndPositionOfChar(ind);
        
        if (pt2.x - pt.x < pt.x - pt1.x) ind++;
        
        this.goTo(ind);
        
        return this;
    };
    
    Cursor.prototype.enable = function(opt) {
	
        this.disable();
        
        if (opt) { this.set(opt); }
        
        var mousedown = this._mousedown.bind(this);
        
        new JSYG(this.textEditor.container).on("mousedown",mousedown);
        
        this.disable = function() {
            this.hide();
            new JSYG(this.textEditor.container).off('mousedown',mousedown);
            this.enabled = false;
            return this;
        };
	
        this.enabled = true;
        return this;
    };
    
    Cursor.prototype.disable = function() { return this; };
    
    
    function Keyboard(textObject) {
        /**
         * référence vers l'objet TextEditor parent
         */
        this.textEditor = textObject;
    }
    
    Keyboard.prototype = {
	
        enabled : false,
        
        keys : ['ArrowLeft','ArrowRight','Home','End','Backspace','Delete','Escape','Return','Enter'],
        
        _firstPos : null,
        
        _getKey : function(e) {
          
          if (e.key) return e.key;
                    
          switch (e.keyCode) {
            case 8 : return "Backspace";
            case 13 : return "Return";
            case 27 : return "Escape";
            case 35 : return "End";
            case 36 : return "Home";
            case 37 : return "ArrowLeft";
            case 39 : return "ArrowRight";
            case 46 : return "Delete";
            default : return String.fromCharCode(e.keyCode);
          }
          
        },
        
        _keypress : function(e) {
          
            var key = this._getKey(e);
            
            if (!/^[\w\W]$/.test(key) || e.ctrlKey || (this.textEditor.cursor.display === false && this.textEditor.display === false)) return;
            
            e.preventDefault();
            
            this.textEditor.selection.deleteChars();
            this.textEditor.cursor.insertChar(key);
        },
        
        _keydown : function(e) {
            
            if (this.textEditor.cursor.display === false  && this.textEditor.selection.from === false) return;
            
            var key = this._getKey(e);
            
            if (this.keys.indexOf(key) == -1 ) return;
            
            e.preventDefault();
            
            var cursor = this.textEditor.cursor,
            select = this.textEditor.selection,
            target = this.textEditor._target,
            //nbchars = target.getNumberOfChars(),
            inverse;
            
            //début d'une sélection au clavier
            if (e.shiftKey && key != 'Home' && key != 'End' && select.from === select.to) {
                this._firstPos = cursor.currentChar;
            }
            
            inverse = this._firstPos >= cursor.currentChar;
            
            switch (key) {
                
                case "ArrowLeft" :
                    if (e.shiftKey) {
                        if (select.display) {
                            if (inverse) select.select(select.from-1,select.to);
                            else select.select(select.from,select.to-1);  
                        }
                        else select.select(cursor.currentChar-1,cursor.currentChar);
                    }
                    else { select.hide(); cursor.prevChar(); }
                    break; 
                
                case "ArrowRight" :
                    if (e.shiftKey) {
                        if (select.display) {
                            if (inverse) select.select(select.from+1,select.to);
                            else select.select(select.from,select.to+1);
                        }
                        else select.select(cursor.currentChar,cursor.currentChar+1);
                    }
                    else { select.hide(); cursor.nextChar(); }
                    break;
                
                case "Home" :
                    if (e.shiftKey) select.select(0,select.from);
                    else { select.hide(); cursor.firstChar(); }
                    break; 
                
                case "End" :
                    if (e.shiftKey) select.select(select.from,target.getNumberOfChars());
                    else { select.hide(); cursor.lastChar(); }
                    break; 
                
                case "Backspace" :
                    if (select.display) select.deleteChars();
                    else if (cursor.currentChar > 0) { cursor.prevChar(); cursor.deleteChar(); }
                    break; 
                
                case "Delete" :
                    if (select.display) select.deleteChars();
                    else if (cursor.currentChar >= 0) cursor.deleteChar();
                    break;
                
                case "Escape" :
                case "Return" :
                case "Enter" :
                    this.textEditor.hide();
                    break;
            }
        },
        
        enable : function() {
            
            this.disable();
            
            var fcts = {
                "keydown" : this._keydown.bind(this),
                "keypress" : this._keypress.bind(this)
            };
            
            new JSYG(document).on(fcts);
            
            this.disable = function() {
                new JSYG(document).off(fcts);
                this.enabled = false;
                return this;
            };
            
            this.enabled = true;
            
            return this;
            
        },
        
        disable : function() { return this; }
        
    };
    
    JSYG.TextEditor = TextEditor;
    
    return TextEditor;
    
});