/**
 * Inputosaurus Text
 *
 * Must be instantiated on an <input> element
 * Allows multiple input items. Each item is represented with a removable tag that appears to be inside the input area.
 *
 * @requires:
 *
 * 	jQuery 1.7+
 * 	jQueryUI 1.8+ Core
 *
 * @version 0.1.6
 * @author Dan Kielp <dan@sproutsocial.com>
 * @created October 3,2012
 *
 * @modified by RainLoop Team
 * @modified by DJMaze
 */


($ => {

	var inputosaurustext = {

		version: "0.1.6",

		fakeSpan: $('<span class="inputosaurus-fake-span"></span>'),

		eventprefix: "inputosaurus",

		options: {

			// bindable events
			//
			// 'change' - triggered whenever a tag is added or removed (should be similar to binding the the change event of the instantiated input
			// 'keyup' - keyup event on the newly created input

			// while typing, the user can separate values using these delimiters
			// the value tags are created on the fly when an inputDelimiter is detected
			inputDelimiters : [',', ';'],

			allowDragAndDrop : true,

			focusCallback : null,

			parseOnBlur : false,

			// simply passing an autoComplete source (array, string or function) will instantiate autocomplete functionality
			autoCompleteSource : '',

			// When forcing users to select from the autocomplete list, allow them to press 'Enter' to select an item if it's the only option left.
			activateFinalResult : false,

			// manipulate and return the input value after parseInput() parsing
			// the array of tag names is passed and expected to be returned as an array after manipulation
			parseHook : null,

			splitHook : null
		},

		_create: function() {
			var widget = this,
				els = {},
				o = widget.options,
				placeholder =  this.element.attr('placeholder') || null;

			this._chosenValues = [];

			// Create the elements
			els.ul = $('<ul class="inputosaurus-container"></ul>');

			if (this.options.allowDragAndDrop)
			{
				els.ul.droppable({
					'drop': (event, ui) => {

						ui.draggable.addClass('inputosaurus-dropped');
						els.input.val(ui.draggable.data('inputosaurus-value'));

						if (ui.draggable.__widget)
						{
							ui.draggable.__widget._removeDraggedTag(ui.draggable);
						}

						widget.parseInput();
					}
				});
			}

			els.input = $('<input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />');
//			els.input = $('<input type="email" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />');
			els.inputCont = $('<li class="inputosaurus-input inputosaurus-required"></li>');
			els.origInputCont = $('<li class="inputosaurus-input-hidden inputosaurus-required"></li>');
			els.lastEdit = '';

			els.input.on('focus', () => {
				widget._focusTrigger(true);
			}).on('blur', () => {
				widget._focusTrigger(false);
			});

			// define starting placeholder
			if (placeholder) {
				o.placeholder = placeholder;
				els.input.attr('placeholder', o.placeholder);
			}

			this.element.replaceWith(els.ul);
			els.origInputCont.append(this.element).hide();

			els.inputCont.append(els.input);
			els.ul.append(els.inputCont);
			els.ul.append(els.origInputCont);

			this.elements = els;

			widget._attachEvents();

			// if instantiated input already contains a value, parse that junk
			if($.trim(this.element.val())){
				els.input.val( this.element.val() );
				this.parseInput();
			}

			this._instAutocomplete();
		},

		_focusTriggerTimer : 0,

		_focusTrigger : function (bValue) {
			var widget = this;
			clearTimeout(this._focusTriggerTimer);
			this._focusTriggerTimer = setTimeout(() => {
				widget.elements.ul[!bValue ? 'removeClass' : 'addClass']('inputosaurus-focused');
				widget.options.focusCallback(bValue);
			}, 10);
		},

		_instAutocomplete : function() {
			if(this.options.autoCompleteSource){
				var widget = this;

				this.elements.input.autocomplete({
					position : {
						of : this.elements.ul
					},
					source : this.options.autoCompleteSource,
					minLength : 1,
					autoFocus : true,
					select : (ev, ui) => {
						ev.preventDefault();
						widget.elements.input.val(ui.item.value);
						widget.parseInput();
					},
					open : function() {
						var menu = $(this).data('ui-autocomplete').menu,
							$menuItems;

						menu.element.width(widget.elements.ul.outerWidth() - 6);

						// auto-activate the result if it's the only one
						if(widget.options.activateFinalResult){
							$menuItems = menu.element.find('li');

							// activate single item to allow selection upon pressing 'Enter'
							if($menuItems.length === 1){
								menu[menu.activate ? 'activate' : 'focus']($.Event('click'), $menuItems);
							}
						}
					},
					focus: () => false
				});
			}
		},

		_autoCompleteMenuPosition : function() {
			var widget;
			if(this.options.autoCompleteSource){
				widget = this.elements.input.data('ui-autocomplete');
				widget && widget.menu.element.position({
					of: this.elements.ul,
					my: 'left top',
					at: 'left bottom',
					collision: 'none'
				});
			}
		},

		parseInput : function(ev) {
			var widget = (ev && ev.data.widget) || this,
				val,
				hook,
				delimiterFound = false,
				values = [];

			val = widget.elements.input.val();

			if (val) {
				hook = widget.options.splitHook(val);
			}

			if (hook) {
				values = hook;
			} else if(delimiterFound !== false){
				values = val.split(delimiterFound);
			} else if(!ev || ev.which === $.ui.keyCode.ENTER && !$('.ui-menu-item .ui-state-focus').length && !$('#ui-active-menuitem').length){
				values.push(val);
				ev && ev.preventDefault();

			// prevent autoComplete menu click from causing a false 'blur'
			} else if(ev.type === 'blur' && !$('#ui-active-menuitem').length){
				values.push(val);
			}

			values = widget.options.parseHook(values);

			if(values.length){
				widget._setChosen(values);
				widget.elements.input.val('');
				widget._resizeInput();
			}
		},

		_inputFocus : function(ev) {
			var widget = ev.data.widget || this;

			widget.elements.input.value || (widget.options.autoCompleteSource.length && widget.elements.input.autocomplete('search', ''));
		},

		_inputKeypress : function(ev) {
			var widget = ev.data.widget || this;

			ev.type === 'keyup' && widget._trigger('keyup', ev, widget);

			switch(ev.which){
				case $.ui.keyCode.BACKSPACE:
					ev.type === 'keydown' && widget._inputBackspace(ev);
					break;

				case $.ui.keyCode.LEFT:
					ev.type === 'keydown' && widget._inputBackspace(ev);
					break;

				default :
					widget.parseInput(ev);
					widget._resizeInput(ev);
			}

			// reposition autoComplete menu as <ul> grows and shrinks vertically
			if(widget.options.autoCompleteSource){
				setTimeout(()=>widget._autoCompleteMenuPosition.call(widget), 200);
			}
		},

		resizeInput : function () {
			this._resizeInput();
		},

		// the input dynamically resizes based on the length of its value
		_resizeInput : function(ev) {
			var widget = (ev && ev.data.widget) || this;
			inputosaurustext.fakeSpan.text(widget.elements.input.val());

//			setTimeout(function  () {
				var txtWidth = 25 + inputosaurustext.fakeSpan.width();
				txtWidth = txtWidth > 50 ? txtWidth : 50;
				txtWidth = txtWidth < 500 ? txtWidth : 500;
				widget.elements.input.width(txtWidth);
//			}, 1);
		},

		// if our input contains no value and backspace has been pressed, select the last tag
		_inputBackspace : function(ev) {
			var widget = (ev && ev.data.widget) || this,
				lastTag = widget.elements.ul.find('li:not(.inputosaurus-required):last');

			// IE goes back in history if the event isn't stopped
			ev.stopPropagation();

			if((!$(ev.currentTarget).val() || (('selectionStart' in ev.currentTarget) && ev.currentTarget.selectionStart === 0 && ev.currentTarget.selectionEnd === 0)) && lastTag.length){
				ev.preventDefault();
				lastTag.find('a').focus();
			}

		},

		_editTag : function(ev) {
			var widget = (ev && ev.data.widget) || this,
				tagName = '',
				$li = $(ev.currentTarget).closest('li'),
				tagKey = $li.data('inputosaurus');

			if(!tagKey){
				return true;
			}

			ev.preventDefault();

			var
				oPrev = null,
				next = false
			;

			$.each(widget._chosenValues, (i,v) => {
				if (v.key === tagKey)
				{
					tagName = v.value;
					next = true;
				}
				else if (next && !oPrev)
				{
					oPrev = v;
				}
			});

			if (oPrev)
			{
				widget.elements.lastEdit = oPrev.value;
			}

			$li.after(widget.elements.inputCont);

			widget.elements.input.val(tagName);
			setTimeout(() => widget.elements.input.select(), 100);

			widget._removeTag(ev);
			widget._resizeInput(ev);
		},

		_tagKeypress : ev => {
			var widget = ev.data.widget;
			switch(ev.which){

				case $.ui.keyCode.DELETE:
				case $.ui.keyCode.BACKSPACE:
					ev && ev.preventDefault();
					ev && ev.stopPropagation();
					$(ev.currentTarget).trigger('click');
					break;

				// 'e' - edit tag (removes tag and places value into visible input
				case 69:
				case $.ui.keyCode.ENTER:
					widget._editTag(ev);
					break;

				case $.ui.keyCode.LEFT:
					ev.type === 'keydown' && widget._prevTag(ev);
					break;

				case $.ui.keyCode.RIGHT:
					ev.type === 'keydown' && widget._nextTag(ev);
					break;

				case $.ui.keyCode.DOWN:
					ev.type === 'keydown' && widget._focus(ev);
					break;
			}
		},

		// select the previous tag or input if no more tags exist
		_prevTag : function(ev) {
			var widget = (ev && ev.data.widget) || this,
				tag = $(ev.currentTarget).closest('li'),
				previous = tag.prev();

			if(previous.is('li')){
				previous.find('a').focus();
			} else {
				widget._focus();
			}
		},

		// select the next tag or input if no more tags exist
		_nextTag : function(ev) {
			var widget = (ev && ev.data.widget) || this,
				tag = $(ev.currentTarget).closest('li'),
				next = tag.next();

			if(next.is('li:not(.inputosaurus-input)')){
				next.find('a').focus();
			} else {
				widget._focus();
			}
		},

		// return the inputDelimiter that was detected or false if none were found
		_containsDelimiter : function(tagStr) {

			var found = false;

			$.each(this.options.inputDelimiters, (k,v) => {
				if(tagStr.indexOf(v) !== -1){
					found = v;
				}
			});

			return found;
		},

		_setChosen : function(valArr) {
			var self = this;

			if(!Array.isArray(valArr)){
				return false;
			}

			$.each(valArr, (k,a) => {
				var v = '', exists = false,
					lastIndex = -1,
					obj = {
						key : '',
						obj : null,
						value : ''
					};

				v = $.trim(a[0]);

				$.each(self._chosenValues, (kk, vv) => {
					if (vv.value === self.elements.lastEdit)
					{
						lastIndex = kk;
					}

					vv.value === v && (exists = true);
				});

				if(v !== '' && a && a[1] && !exists){

					obj.key = 'mi_' + Math.random().toString( 16 ).slice( 2, 10 );
					obj.value = v;
					obj.obj = a[1];

					if (-1 < lastIndex)
					{
						self._chosenValues.splice(lastIndex, 0, obj);
					}
					else
					{
						self._chosenValues.push(obj);
					}

					self.elements.lastEdit = '';
					self._renderTags();
				}
			});

			if (valArr.length === 1 && valArr[0] === '' && self.elements.lastEdit !== '')
			{
				self.elements.lastEdit = '';
				self._renderTags();
			}

			self._setValue(self._buildValue());
		},

		_buildValue : function() {
			var value = '';

			$.each(this._chosenValues, (k,v) => {
				value += value.length ? ',' + v.value : v.value;
			});

			return value;
		},

		_setValue : function(value) {
			var val = this.element.val();

			if(val !== value){
				this.element.val(value);
				this._trigger('change');
			}
		},

		// @name text for tag
		// @className optional className for <li>
		_createTag : function(name, key, obj) {
			if (name !== undefined && obj) {
				var
					widget = this,
					$li = $('<li data-inputosaurus="' + key + '" title="' + obj.toLine(false, false, true) +
						'"><a href="javascript:void(0);" class="ficon">&#x2716;</a><span>' +
						obj.toLine(true, false, true) + '</span></li>')
				;

				$li.data('inputosaurus-value', obj.toLine(false, false, false));

				if (this.options.allowDragAndDrop)
				{
					$li.draggable({
						'revert': 'invalid',
						'revertDuration': 200,
						'start': (event, ui) => ui.helper.__widget = widget
					});
				}

				return $li;
			}
		},

		_renderTags : function() {
			var self = this;

			this.elements.ul.find('li:not(.inputosaurus-required)').remove();

			$.each(this._chosenValues, (k, v) => {
				var el = self._createTag(v.value, v.key, v.obj);
				if (el) {
					self.elements.ul.find('li.inputosaurus-input').before(el);
				}
			});
		},

		_removeTag : function(ev) {
			var key = $(ev.currentTarget).closest('li').data('inputosaurus'),
				indexFound = false,
				widget = (ev && ev.data.widget) || this;


			$.each(widget._chosenValues, (k,v) => {
				if(key === v.key){
					indexFound = k;
				}
			});

			indexFound !== false && widget._chosenValues.splice(indexFound, 1);

			widget._setValue(widget._buildValue());

			$(ev.currentTarget).closest('li').remove();
			setTimeout(() => widget.elements.input.focus(), 100);
		},

		_removeDraggedTag : function ($li) {
			var
				key = $li.data('inputosaurus'),
				widget = this,
				indexFound = false
			;

			$.each(widget._chosenValues, (k,v) => {
				if (key === v.key) {

					indexFound = k;
				}
			});

			if (false !== indexFound)
			{
				widget._chosenValues.splice(indexFound, 1);
				widget._setValue(widget._buildValue());
			}

			$li.remove();
		},

		focus : function () {
			this.elements.input.focus();
		},

		blur : function () {
			this.elements.input.blur();
		},

		_focus : function(ev) {
			var
				widget = (ev && ev.data.widget) || this,
				li = (ev && ev.target) ? $(ev.target).closest('li') : null
			;

			if (li && li.is('li')) {
				li.find('a').focus();
			}
			if (!ev || !$(ev.target).closest('li').data('inputosaurus')) {
				widget.elements.input.focus();
			}
		},

		_tagFocus : ev => $(ev.currentTarget).parent()[ev.type === 'focusout' ? 'removeClass' : 'addClass']('inputosaurus-selected'),

		refresh : function() {
			var delim = ',',
				val = this.element.val(),
				values = [];

			values.push(val);

			if (val) {
				if ($.isFunction(this.options.splitHook)) {
					var hook = this.options.splitHook(val);
					if (hook) {
						values = hook;
					}
				} else {
					delim && (values = val.split(delim));
				}
			}

			if (values.length) {
				this._chosenValues = [];

				values = this.options.parseHook(values);

				this._setChosen(values);
				this._renderTags();
				this.elements.input.val('');
				this._resizeInput();
			}
		},

		_attachEvents : function() {

			var widget = this, els = this.elements;
			if (els) {
				els.input.on('keyup.inputosaurus', {widget : widget}, this._inputKeypress);
				els.input.on('keydown.inputosaurus', {widget : widget}, this._inputKeypress);
				els.input.on('change.inputosaurus', {widget : widget}, this._inputKeypress);
				els.input.on('focus.inputosaurus', {widget : widget}, this._inputFocus);

				this.options.parseOnBlur && els.input.on('blur.inputosaurus', {widget : widget}, this.parseInput);

				els.ul.on('click.inputosaurus', {widget : widget}, this._focus);
				els.ul.on('click.inputosaurus', 'a', {widget : widget}, this._removeTag);
				els.ul.on('dblclick.inputosaurus', 'li', {widget : widget}, this._editTag);
				els.ul.on('doubletap.inputosaurus', 'li', {widget : widget}, this._editTag);
				els.ul.on('focus.inputosaurus', 'a', {widget : widget}, this._tagFocus);
				els.ul.on('blur.inputosaurus', 'a', {widget : widget}, this._tagFocus);
				els.ul.on('keydown.inputosaurus', 'a', {widget : widget}, this._tagKeypress);
			}
		},

		_destroy: function() {
			var els = this.elements;
			if (els) {
				els.input.off('.inputosaurus');
				els.ul.replaceWith(this.element);
			}
		}
	};

	$('body').append(inputosaurustext.fakeSpan);
	$.widget("ui.inputosaurus", inputosaurustext);

})(jQuery);

