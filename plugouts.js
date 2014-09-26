  var PrimePlugouts = PrimePlugouts || function() {
      var KEYBOARD = {};
      KEYBOARD.UP_KEYCODE = 38;
      KEYBOARD.DOWN_KEYCODE = 40;
      KEYBOARD.LEFT_KEYCODE = 37;
      KEYBOARD.RIGHT_KEYCODE = 39;
      KEYBOARD.ENTER_KEY = 13;
      KEYBOARD.TAB_KEY = 9;
      KEYBOARD.BACKSPACE_KEY = 8;
      KEYBOARD.SHIFT_KEY = 16;
      KEYBOARD.TOP_OFFSET = 9;
      KEYBOARD.DELETE_KEY = 46;
      KEYBOARD.SEMICOLON = 59;

      var spaceTrim = function(x) {
        return x.replace(/^\s+|\s+$/gm, '');
      };

      return {
        KEYBOARD: KEYBOARD,
        spaceTrim: spaceTrim
      }
    }();
  PrimePlugouts.autoComplete = PrimePlugouts.autoComplete || function(object_to_enhance) {
    var o = object_to_enhance;
    if (typeof o == "undefined" || o === null) {
      return;
    }
    if (!o.jquery) {
      o = $(o);
    }

    var bodySelector = document.body;
    var dataDimensionCount = 0;
    var $body = null;
    var ppo = PrimePlugouts;

    /* OBJECTS */
    var options = {};
    options.dataSourceFunc = null;
    options.matchSearch = false;
    options.enableChiclets = false;
    options.usesCallback = false;
    options.multiSelect = false;
    options.chicletClass = null;
    options.startSearchChars = null;
    options.startSearchDelay = null;
    options.listCssClass = null;
    options.textBoxCssClass = null;
    options.width = null;
    options.height = null;
    options.maxItemsToRender = null;
    options.maxItemsToReturnFromServer = null;
    options.noRecordsText = null;
    options.noRecordsId = null;
    options.getListOnFocus = null;
    options.multiSelectIconClass = null;
    options.allowFreeForm = null;

    var loadIndex = {};
    loadIndex.start = 0;
    loadIndex.end = 0;

    var selectedOption = {};
    selectedOption.id = null;
    selectedOption.text = null;

    var selectedOptions = {};
    selectedOptions.ids = [];
    selectedOptions.texts = [];

    var freeformOption = {};
    freeformOption.id = null;

    var dropDown = {};
    dropDown.top = null;
    dropDown.left = null;
    dropDown.width = null;

    /*Closure arrays*/
    var sourceArray = [];
    var loadedArray = [];
    var textElements = [];
    var oldTextElements = [];

    /* Constants */
    var KEYBOARD = ppo.KEYBOARD;

    var AUTOCOMPLETE_DATA = "data-primeAutocomplete";
    var SHOW_CLASS = "show";
    var ACTIVE_CLASS = "active";
    var SELECTED_CLASS = "selected";
    var SELECTED_CLASS_SELECTOR = ".selected";
    var NO_RECORDS_MESSAGE = "No records match your search";
    var TOP_OFFSET = 9;

    /* Other, closure-level variables*/
    var $newSelection = null;
    var $listCollection = null;
    var $singleControl = null;
    var useCallback = true;
    var addActiveToSelected = false;
    var noCallbackTextSnapshot = null;
    var dropDownIsVisible = false;
    var isChicletizing = false;
    var tabIsPending = false;

    /* INIT */
    var autoComplete = function(optionsObject) {
      mapObjects();
      setOptions(optionsObject);
      setOptionDependencies();
      addAttributes();
      bindEvents();
    };
    var mapObjects = function() {
      $body = $(bodySelector);
    };
    var bindEvents = function() {
      if (options.getListOnFocus) {
        o.click(getSelectionData);
      }
      o.keypress(function(event) {
        manageKeypress(event);
      });
      o.keyup(function(event) {
        manageKeyup(event);
        if (o.text().indexOf(noCallbackTextSnapshot) === -1) {
          useCallback = true;
        }
      });
      o.keydown(function(event) {
        manageKeyDown(event);
      });
      o.blur(handleFocusout);
    };
    var bindChiclets = function() {
      var $chicletAnchors = o.find("a");
      $chicletAnchors.each(function(event) {
        $(this).click(deleteChiclet);
      });

    };
    var addAttributes = function() {
      o.attr("contenteditable", "true");
      o.attr(AUTOCOMPLETE_DATA, "true");
      addSpan(o);
      o.addClass(options.textBoxCssClass);
      if (options.multiSelect) {
        o.addClass(options.multiSelectIconClass);
      }
      if (options.width) {
        o.width(options.width);
      }
    };

    /* GETTING DATA INTO THE CONTROL */
    var getSelectionData = function(event) {
      var sansChicletsText = null;
      if (!options.getListOnFocus) {
        if (options.startSearchChars) {
          if (o.text().length < options.startSearchChars) {
            return;
          }
          if (options.multiSelect) {
            sansChicletsText = getTextMinusSpans(o.html());
            if (sansChicletsText.length < options.startSearchChars) {
              return;
            }
          }
        }
      }
      if (options.usesCallback && options.dataSourceFunc) {
        if (useCallback) {
          options.dataSourceFunc(searchCriteria(), asynchCallback);
        } else {
          asynchCallback();
        }
      } else {
        sourceArray = options.dataSourceFunc();
        if (sourceArray && sourceArray.length > 0) {
          asynchCallback();
        }
      }
    };
    var asynchCallback = function(cbSourceArray) {
      if (typeof sourceArray == "undefined" || sourceArray === null || typeof sourceArray.length == "undefined" || sourceArray.length === null) {
        return;
      }
      if (typeof cbSourceArray != "undefined" && cbSourceArray !== null && typeof cbSourceArray.length != "undefined" && cbSourceArray.length !== null) {
        sourceArray = cbSourceArray;
        useCallback = (sourceArray.length >= options.maxItemsToReturnFromServer);
        if (!useCallback) {
          noCallbackTextSnapshot = o.text();
        }
      }
      dataDimensionCount = getDimensionCount(sourceArray);
      if (sourceArray.length <= options.maxItemsToRender) {
        loadedArray = sourceArray.slice(0);
      } else {
        loadIndex.start = findFirstSourceIndex(searchCriteria(), sourceArray);
        loadIndex.end = sourceArray.length;
        loadedArray = sourceArray.slice(loadIndex.start, loadIndex.end);
      }
      if (searchCriteria().length && searchCriteria().length >= options.startSearchChars) {
        removeNonMatchingOptionsFromList();
      }
      manageOptionList(loadedArray);
    };
    var manageOptionList = function(data) {
      var chicletIds = [];
      chicletIds = getChicletIds();
      if (options.matchSearch && searchCriteria().length === 0) {
        if ($newSelection && $newSelection.length) {
          $newSelection.remove();
        }
        //return;
      }
      if (typeof data == "undefined" || data === null || data.length === 0) {
        if ($newSelection && $newSelection.length) {
          $newSelection.remove();
        }
        return;
      } else if ($newSelection != "undefined" && $newSelection !== null && typeof $newSelection.length != "undefined" && typeof $newSelection.length !== null && $newSelection.length > 0) {
        $newSelection.find("li").remove();
      } else {
        $newSelection = $("<ul>");
      }
      if (data.length > 0) {
        $newSelection.addClass(options.listCssClass);
        $body.append($newSelection);
        var markup = "";
        for (var i = 0; i < data.length; i++) {
          if (data[i].id && data[i].text) {
            if ($.inArray(data[i].id + "", chicletIds) != -1) {
              markup += "<li id='" + data[i].id + "' class='" + SELECTED_CLASS + "'><a>" + data[i].text + "</a></li>";
            } else {
              markup += "<li id='" + data[i].id + "'><a>" + data[i].text + "</a></li>";
            }
          } else {
            if ($.inArray(data[i] + "", chicletIds) != -1) {
              markup += "<li id='" + data[i] + "' class='" + SELECTED_CLASS + "'><a>" + data[i] + "</a></li>";
            } else {
              markup += "<li id='" + data[i] + "'><a>" + data[i] + "</a></li>";
            }
          }
        }
        $newSelection.html(markup);
        $listCollection = $("li", $newSelection);
        $listCollection.click(handleListCollectionSelect);
        setDropdownPosition();
        if (!options.width) {
          $newSelection.width(o.width());
        } else {
          $newSelection.width(options.width);
        }
        $newSelection.addClass(SHOW_CLASS);
        $newSelection.attr(AUTOCOMPLETE_DATA, "true");

        $body.mouseup(handleFocusout);
      }
    };
    var promoteValue = function(event) {
      var el = getActiveOption();
      if (options.multiSelect) {
        if (addActiveToSelected) {
          setActiveItemToSelected();
          addActiveToSelected = false;
        }
        chicletizeEntries();
        setDropdownPosition();
        placeCaretAtEnd(o);
      } else //if single select
      {
        if (el !== null && el.length > 0) {
          selectedOption.text = el.text();
          selectedOption.id = el.attr("id");
          if (selectedOption.id != options.noRecordsId) {
            o.text(selectedOption.text);
          }
          placeCaretAtEnd(o);
        } else {
          selectedOption.text = null;
          selectedOption.id = null;
        }
      }
      useCallback = true;

      triggerChange();
    };
    var promoteTopRecord = function(event) {
      var el = getTopRecordFromList();
      if (getOptionId(el) != options.noRecordsId) {
        setActiveOption(el);
        addActiveToSelected = true;
        promoteValue(event);
      }
    };
    //RAISE EVENTS
    var triggerChange = function() {
      o.trigger({
        type: "plugoutChange",
        object: "autocomplete",
        time: new Date()
      });
    };
    var triggerBlur = function() {
      o.trigger({
        type: "plugoutBlur",
        object: "autocomplete",
        time: new Date()
      });
    };
    //HANDLERS
    var handleFocusout = function(event) {
      var rents = null;
      var isTargetInFamily = false;
      var attr = $(event.target).attr(AUTOCOMPLETE_DATA);

      if (typeof attr !== undefined && attr === "true") {
        isTargetInFamily = true;
      }

      if (!isTargetInFamily) {
        rents = $(event.target).parents();
        rents.each(function() {
          if ($(this).attr(AUTOCOMPLETE_DATA)) {
            isTargetInFamily = true;
            return;
          }
        });
      }
      if (!isTargetInFamily) {
        resetAll();
        triggerBlur();
      }
      event.preventDefault();
    };

    var resetAll = function(event) {
      manageOptionList();
      deactivateAllOptions();
      dropDownIsVisible = false;
      if (options.multiSelect) {
        o.html(getChicletSpans());
        bindChiclets();
      }
    };
    var removeNonMatchingOptionsFromList = function() {
      var matchCounter = 0;
      var matchArray = [];
      var lowercaseElement = null;
      var searchPattern = null;
      if (options.matchSearch && searchCriteria().length > 0) {
        for (var i = 0; i < loadedArray.length; i++) {
          if (dataDimensionCount === 2 && typeof loadedArray[i].text != "undefined" && loadedArray[i].text !== null) {
            if (PrimePlugouts.spaceTrim(loadedArray[i].text).toLowerCase().indexOf(PrimePlugouts.spaceTrim(searchCriteria()).toLowerCase()) !== -1) {
              matchArray.push(loadedArray[i]);
              matchCounter++;
              if (matchCounter === options.maxItemsToRender) {
                break;
              }
            }
          } else if (dataDimensionCount === 1) {
            lowercaseElement = loadedArray[i].toLowerCase();
            searchPattern = searchCriteria();
            if (searchPattern && searchPattern.length > 0) {
              searchPattern = searchPattern.toLowerCase();
            }
            if (lowercaseElement.indexOf(searchPattern) !== -1) {
              matchArray.push(loadedArray[i]);
              matchCounter++;
              if (matchCounter === options.maxItemsToRender) {
                break;
              }
            }
          }
        }
        if (matchArray.length === 0) {
          loadedArray = [];
          loadedArray.push({
            id: options.noRecordsId,
            text: options.noRecordsText
          });
        } else {
          loadedArray = matchArray;
        }
      }
    };
    var handleListCollectionSelect = function(event) {
      if (!options.multiSelect) {
        setActiveOption($(this));
        promoteValue(event);
        resetAll();
      } else {
        toggleSelectedOption($(this));
        promoteValue(event);
      }
    };
    //KEYCODE MANAGERS
    //****KEYCODE EVENTS
    var manageKeyup = function(event) {
      if (manageArrowKeys(event)) return;
      if (manageTabKeyUp(event)) return;
      if (manageEnterKey(event)) return;
      manageDeleteKey(event);
      if (manageBackspace(event)) {
        getSelectionData(event);
      }
      //promoteValue(event);
      event.preventDefault();
    };
    var manageKeyDown = function(event) {
      if (manageTabKeyDown(event)) return;
      if (manageEnterKey(event)) return;
    };
    var manageKeypress = function(event) {
      if (isFreeFormTermination(event)) {
        chicletizeFreeFormItem();
        event.preventDefault();
      }
    };
    //****SPECIFIC KEYS
    var manageDeleteKey = function(event) {
      var keyCode = event.keyCode || event.which;
      if (keyCode == KEYBOARD.DELETE_KEY) {
        if (options.startSearchChars) {
          if (o.text().length < options.startSearchChars) {
            resetAll();
          }
        }
      }
    };
    var manageBackspace = function(event) {
      var keyCode = event.keyCode || event.which;
      if (keyCode !== KEYBOARD.BACKSPACE_KEY) return true;
      if (options.multiSelect) {
        var txt = searchCriteria();
        if (!options.getListOnFocus) {
          if (!txt || txt.length === 0) {
            resetAll();
            return false;
          }
        }
      } else {
        selectedOption.id = null;
        selectedOption.text = null;
      }
      triggerChange();

      if (options.startSearchChars && !options.getListOnFocus) {
        if (o.text().length < options.startSearchChars) {
          resetAll();
        }
      }
      return true;
    };
    var manageEnterKey = function(event) {
      var keyCode = event.keyCode || event.which;
      if (keyCode == KEYBOARD.ENTER_KEY) {
        if (options.multiSelect) {
          addActiveToSelected = true;
          promoteValue(event);
        } else {
          promoteValue(event);
          resetAll();
        }
        return true;
      }
      return false;
    };
    var manageTabKeyUp = function(event) {
      var keyCode = event.keyCode || event.which;
      if (keyCode == KEYBOARD.TAB_KEY) {
        if (options.getListOnFocus) {
          o.click(getSelectionData);
        }
        return true;
      }
      return false;
    };
    var manageTabKeyDown = function(event) {
      var keyCode = event.keyCode || event.which;
      if (keyCode == KEYBOARD.TAB_KEY) {
        if (listIsShowing() && listHasRecords() && !textIsFreeFormEntry()) {
          promoteTopRecord(event);
        }
        if (tabIsPending) {
          resetAll();
          tabIsPending = false;
        } else {
          event.preventDefault();
          tabIsPending = true;
        }
        return true;
      }
      return false;
    };
    var manageArrowKeys = function(event) {
      var keyCode = event.keyCode || event.which;
      var el = null;
      if (keyCode === KEYBOARD.DOWN_KEYCODE) {
        if ($listCollection === null || $listCollection.length === 0) return true;
        if (!$listCollection.hasClass(ACTIVE_CLASS)) {
          $listCollection.first().addClass(ACTIVE_CLASS);
        } else {
          el = getActiveOption();
          selectNextOption(el);
        }
        return true;
      } else if (keyCode === KEYBOARD.UP_KEYCODE) {
        el = getActiveOption();
        if (el && el.index() === 0) {
          el.removeClass(ACTIVE_CLASS);
        } else if (!el) {
          $listCollection.last().addClass(ACTIVE_CLASS);
        } else {
          selectPreviousOption(el);
        }
        return true;
      } else if (keyCode === KEYBOARD.LEFT_KEYCODE || keyCode === KEYBOARD.RIGHT_KEYCODE) {
        return true;
      }
      return false;
    }
    //UTILITIES
    //****DROP DOWN LIST UTILITIES
    var deactivateAllOptions = function() {
      if ($listCollection && $listCollection.length > 0) {
        $listCollection.removeClass("active");
      }
    };
    var getActiveOption = function() {
      var el = null;
      if ($listCollection && $listCollection.length > 0) {
        $listCollection.each(function() {
          if ($(this).hasClass("active")) {
            el = $(this);
          }
        });
      }
      return el;
    };
    var getOptionId = function(el) {
      var id = 0;
      if (el.attr) {
        id = el.attr("id");
      }
      return id;
    };
    var getSelectedOptions = function() {
      return $newSelection.find(SELECTED_CLASS_SELECTOR);
    };
    var getSelectedOptionIds = function() {
      var ids = [];
      var $els = getSelectedOptions();

      $els.each(function() {
        var id = $(this).attr("id");
        ids.push(id);
      });
      var chicletIds = getChicletIds();

      if (chicletIds.length > 0) {
        return chicletIds.concat(ids);
      }
      return ids;
    };
    var getSelectedOptionTexts = function() {
      var texts = [];
      var $els = getSelectedOptions();

      $els.each(function() {
        var text = $(this).text();
        texts.push(text);
      });
      var chicletTexts = getChicletTexts();

      if (chicletTexts.length > 0) {
        return chicletTexts.concat(texts);
      }
      return texts;
    };
    var getTopRecordFromList = function() {
      return $listCollection.first();
    };
    var listIsShowing = function() {
      if ($newSelection && $newSelection.length) return true;
      return false;
    };
    var listHasRecords = function() {
      if ($listCollection && $listCollection.length > 0) return true;
      return false;
    };
    var selectNextOption = function(currentOption) {
      selectSiblingOption(currentOption, 1);
    };
    var selectPreviousOption = function(currentOption) {
      selectSiblingOption(currentOption, -1);
    };
    var selectSiblingOption = function(currentOption, increment) {
      if ($newSelection !== null && $("li", $newSelection).length > 0) {
        if (currentOption !== null && currentOption.length > 0) {
          var index = currentOption.index();
          index += increment;
          var $nextOption = $("li:eq(" + index + ")", $newSelection);
          $nextOption.addClass(ACTIVE_CLASS);
          currentOption.removeClass(ACTIVE_CLASS);
        }
      }
    };
    var setActiveItemToSelected = function() {
      var el = getActiveOption();
      if (el) {
        el.addClass(SELECTED_CLASS);
      }
    };
    var setActiveOption = function(el) {
      deactivateAllOptions();
      el.addClass(ACTIVE_CLASS);
    };
    var setDropdownPosition = function() {
      if (!$newSelection || $newSelection.length === 0) {
        return this;
      }
      var pos = o.offset();
      var top = pos.top + o.height() + TOP_OFFSET;
      $newSelection.css("position", "absolute");
      $newSelection.css("top", top);
      $newSelection.css("left", pos.left);
      dropDownIsVisible = true;
    };
    var toggleSelectedOption = function(el) {
      if (el.hasClass(SELECTED_CLASS)) {
        el.removeClass(SELECTED_CLASS);
        if (options.multiSelect) {
          removeChiclet(el);
        }
        return;
      }
      el.addClass(SELECTED_CLASS);
    };
    //****CHICKLET UTILITIES
    var chicletizeEntries = function() {
      if (!options.enableChiclets) return;
      isChicletizing = true;
      var clets = [];
      var clet = null;
      var seenIds = [];
      var seenTexts = [];
      var i = 0;

      setIds(getSelectedOptionIds());
      setTexts(getSelectedOptionTexts());

      seenIds = getChicletIds();
      seenTexts = getChicletTexts();

      for (i = 0; i < seenIds.length; i++) {
        clet = makeChiclet(seenIds[i], seenTexts[i]);
        clets.push(clet);
      }

      for (i = 0; i < selectedOptions.texts.length; i++) {
        if ($.inArray(selectedOptions.ids[i], seenIds) === -1) {
          clet = makeChiclet(selectedOptions.ids[i], selectedOptions.texts[i]);
          clets.push(clet);
        }
      }
      if (options.allowFreeForm && freeformOption.id !== null) {
        clet = makeChiclet(freeformOption.id, freeformOption.id);
        clets.push(clet);

        freeformOption.id = null;
      }
      o.html(clets.join(""));
      bindChiclets();
      isChicletizing = false;
    };
    var chicletizeFreeFormItem = function() {
      var txt = searchCriteria();
      addFreeFormItemToFreeFormOptions(txt);
      chicletizeEntries();
      resetAll();
      placeCaretAtEnd(o);
    };
    var deleteChiclet = function(event) {
      var $rent = null;

      var $that = $(this);
      if ($that.length > 0) {
        $rent = $that.parent();
        if ($rent) {
          removeChiclet($rent);
        }
      }
    };
    var deleteChicletById = function(id) {
      var $chics = getChicletSpans();
      if ($chics && $chics.length > 0) {
        $chics.each(function() {
          $that = $(this);
          if ($that.attr("id") == id) {
            $that.remove();
            triggerChange();
          }
        });
      }
    };
    var getChicletIds = function() {
      var $els = getChicletSpans();
      var id = null;
      var ids = [];
      $els.each(function() {
        id = $(this).attr("id");
        if (id) {
          ids.push(id);
        }
      });
      return ids;
    };
    var getChicletSpans = function() {
      return o.find("span");
    };
    var getChicletTexts = function() {
      var $els = getChicletSpans();
      var txt = null;
      var texts = [];
      $els.each(function() {
        txt = $(this).text();
        if (txt) {
          texts.push(txt);
        }
      });
      return texts;
    };
    var makeChiclet = function(id, text) {
      var clet = "<span style='white-space:nowrap' id='" + id + "' class='" + options.chicletClass + "' contenteditable='false'>";
      clet += "<a style='color:inherit'><i class='fa fa-times'></i></a>";
      clet += text;
      clet += "</span>";

      return clet;
    };
    var removeChiclet = function(el) {
      var id = getOptionId(el);
      deleteChicletById(id);
    };
    //****SOURCE ARRAY UTILITIES
    var findFirstSourceIndex = function(search_pattern, array_to_search) {
      var p = search_pattern;
      var a = array_to_search;
      for (var i = 0; i < a.length; i++) {
        if (dataDimensionCount === 2 && typeof a[i].text != "undefined" && a[i].text !== null) {
          if (a[i].text.toLowerCase().indexOf(p.toLowerCase()) !== -1) {
            return i;
          }
        } else if (dataDimensionCount === 1) {
          if (a[i].indexOf(p) !== -1) {
            return i;
          }
        }
      }
    };
    var getDimensionCount = function(data) {
      if (data && data.length > 0) {
        if (data[0].id && data[0].text) {
          return 2;
        } else {
          return 1;
        }
      }
      return 0;
    };
    //****SEARCH UTILITIES
    var getTextMinusSpans = function(string_to_butcher) {
      var stb = string_to_butcher;
      var re = /<span .*<\/span>/g;
      var reWS = /&nbsp;/g;
      stb = stb.replace(re, "");
      stb = stb.replace(reWS, "");
      stb = removeStragglingSpans(stb);
      return stb;
    };
    var removeStragglingSpans = function(string_to_remove_spans_from) {
      var openSpan = /<span>/g;
      var closeSpan = /<\/span>/g;
      var s = string_to_remove_spans_from;
      s = s.replace(openSpan, "");
      s = s.replace(closeSpan, "");

      return s;
    };
    var searchCriteria = function() {
      var txt = null;
      if (options.multiSelect) {
        if (options.enableChiclets) {
          txt = getTextMinusSpans(o.html());
          return txt;
        }
      }
      return o.text();
    };
    //****TEXTBOX UTILITIES
    var addSpan = function(element_to_add_span_to) {
      var e = element_to_add_span_to;

      var theSpan = $("<span>");
      e.append(theSpan);
      return theSpan;
    };
    var addFreeFormItemToFreeFormOptions = function(value) {
      if (freeformOption === null) freeformOption = {};
      freeformOption.id = value;
    };
    var isFreeFormTermination = function(event) {
      var keyCode = event.keyCode || event.which;
      if (!options.allowFreeForm) return false;
      if (keyCode != KEYBOARD.SEMICOLON) return false;
      return true;
    };
    var placeCaretAtEnd = function(el) {
      if (el.jquery) {
        el = el[0];
      }
      el.focus();
      if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        //range.selectNode(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
      }
      $(el).append("&nbsp;");
    };
    var textIsFreeFormEntry = function() {
      if (!options.allowFreeForm) return false;
      var txt = searchCriteria();
      if (txt !== null && txt.length > 1 && txt.indexOf(";") != -1) {
        return true;
      }
      return false;
    };
    //****GLOBAL UTILITIES
    var getId = function() {
      return selectedOption.id;
    };
    var getText = function() {
      return (selectedOption.text !== null ? selectedOption.text : "");
    };
    var getIds = function() {
      var els = getChicletSpans();
      var id = null;
      selectedOptions.ids = [];
      els.each(function() {
        id = $(this).attr("id");
        if (id) {
          selectedOptions.ids.push(id);
        }
      });
      return selectedOptions.ids.length > 0 ? selectedOptions.ids : [];
    };
    var getTexts = function() {
      var els = getChicletSpans();
      var txt = null;
      selectedOptions.texts = [];
      els.each(function() {
        txt = $(this).text();
        if (txt) {
          selectedOptions.texts.push(txt);
        }
      });
      return selectedOptions.texts.length > 0 ? selectedOptions.texts : [];
    };
    var setIds = function(ids) {
      selectedOptions.ids = ids;
      if (!isChicletizing) {
        if (selectedOptions.ids.length && selectedOptions.texts.length && selectedOptions.ids.length === selectedOptions.texts.length) {
          chicletizeEntries();
        }
      }
    };
    var setTexts = function(texts) {
      if (!$.isArray(texts)) {
        texts = texts.split(",");
      }

      selectedOptions.texts = texts;
      if (!isChicletizing) {
        if (selectedOptions.ids.length && selectedOptions.texts.length && selectedOptions.ids.length === selectedOptions.texts.length) {
          chicletizeEntries();
        }
      }
    };
    var setId = function(id) {
      selectedOption.id = id;
    };
    var setOptions = function(optionsObject) {
      if (typeof optionsObject == "undefined" || optionsObject === null) {
        optionsObject = {};
      }
      options.dataSourceFunc = optionsObject.dataSourceFunc ? optionsObject.dataSourceFunc : null;
      options.matchSearch = optionsObject.matchSearch ? optionsObject.matchSearch : false;
      options.enableChiclets = optionsObject.enableChiclets ? optionsObject.enableChiclets : false;
      options.usesCallback = optionsObject.usesCallback ? optionsObject.usesCallback : false;
      options.multiSelect = optionsObject.multiSelect ? optionsObject.multiSelect : false;
      options.chicletClass = optionsObject.chicletClass ? optionsObject.chicletClass : "label label-lg btn-label";
      options.startSearchChars = optionsObject.startSearchChars ? optionsObject.startSearchChars : null;
      options.startSearchDelay = optionsObject.startSearchDelay ? optionsObject.startSearchDelay : null;
      options.width = optionsObject.width ? optionsObject.width : null;
      options.height = optionsObject.height ? optionsObject.height : null;
      options.listCssClass = optionsObject.listCssClass ? optionsObject.listCssClass : "dropdown-menu autocomplete-dropdown";
      options.textBoxCssClass = optionsObject.textBoxCssClass ? optionsObject.textBoxCssClass : "form-control form-control-editable autocomplete-control";
      options.multiSelectIconClass = optionsObject.multiSelectIconClass ? optionsObject.multiSelectIconClass : "form-control-down-caret";
      options.maxItemsToRender = optionsObject.maxItemsToRender ? optionsObject.maxItemsToRender : 15;
      options.maxItemsToReturnFromServer = optionsObject.maxItemsToReturnFromServer ? optionsObject.maxItemsToReturnFromServer : 1000;
      options.noRecordsText = optionsObject.noRecordsText ? optionsObject.noRecordsText : NO_RECORDS_MESSAGE;
      options.noRecordsId = optionsObject.noRecordsId ? optionsObject.noRecordsId : -1;
      options.getListOnFocus = optionsObject.getListOnFocus ? optionsObject.getListOnFocus : false;
      options.allowFreeForm = optionsObject.allowFreeForm ? optionsObject.allowFreeForm : false;
    };
    var setOptionDependencies = function() {
      if (options.multiSelect) {
        o.getId = getIds;
        o.getText = getTexts;
        o.setId = setIds;
        o.setText = setTexts;
      } else {
        o.getId = getId;
        o.getText = getText;
        o.setId = setId;
        o.setText = setText;
      }
    };
    var setText = function(txt) {
      selectedOption.text = txt;
      o.text(txt);
    };

    o.autoComplete = autoComplete;
    //some public functions are defined in setOptionDependencies()
    return o;
  };
  PrimePlugouts.DateTimeMask = PrimePlugouts.DateTimeMask || function(object_to_enhance) {

    var o = object_to_enhance;
    if (typeof o == "undefined" || o === null) {
      return;
    }
    if (!o.jquery) {
      o = $(o);
    }

    var bodySelector = document.body;
    var ppo = PrimePlugouts;
    /*BOOL*/
    var isInput = false;
    var isDiv = false;

    /* OBJECTS */
    var options = {};
    options.width = null;
    options.height = null;
    options.errorClass = null;
    options.blankOnError = null;
    options.textBoxCssClass = null;

    var $body = null;

    /* Constants */
    var KEYBOARD = ppo.KEYBOARD;
    var SHOW_CLASS = "show";
    var EDITABLE_DIV_CLASS = "form-control-editable";

    var precheckText = null;
    /* INIT */
    var mask = function(optionsObject) {
      mapObjects();
      setOptions(optionsObject);
      detectElementType();
      addAttributes();
      bindEvents();
    };
    var mapObjects = function() {
      $body = $(bodySelector);
    };
    var bindEvents = function() {
      o.focusout(function(event) {
        manageFocusout(event);
      });
    };
    var addAttributes = function() {
      o.addClass(options.textBoxCssClass);
      if (options.width) {
        o.width(options.width);
      }
      if (options.height) {
        o.height(options.height);
      }
      if (isDiv) {
        o.addClass(EDITABLE_DIV_CLASS);
        o.attr("contenteditable", "true");
      }
    };
    var manageFocusout = function(event) {
      if (isEmpty()) {
        if (o.hasClass(options.errorClass)) {
          o.removeClass(options.errorClass);
        }
        return;
      }
      checkAndCorrect();
    };
    var checkAndCorrect = function() {
      precheckText = o.textValue();
      o.textValue(o.textValue().toUpperCase());
      fixLeadingZero();
      fixMissingColon();
      fixMissingMinutes();
      fixMissingMeridian();
      removeAllWhitespace();
      fixNoSpaceBeforeMeridian();
      if (checkIsPerfect()) return;
      else rollbackText();
    };
    var rollbackText = function() {
      if (!options.blankOnError) {
        o.textValue(precheckText);
        if (options.errorClass) {
          o.addClass(options.errorClass);
        }
      } else {
        o.textValue("");
      }
    };
    var checkIsPerfect = function() {
      if (!isPerfect() && (precheckText && precheckText !== "")) {
        return false;
      } else {
        if (options.errorClass) {
          o.removeClass(options.errorClass);
        }
      }
      return true;
    };
    var isPerfect = function() {
      var re = /(^([0-9]|[0-1][0-2]):([0-5][0-9])(\s{1,1})(AM|PM)$)/;
      return re.test(o.textValue());
    };
    var removeAllWhitespace = function() {
      var re = /\s+/;
      var str = o.textValue();
      str = str.replace(re, "");
      o.textValue(str);
    };
    var fixNoSpaceBeforeMeridian = function() {
      var re = /(^([0-9]|[0-1][0-9]|[2][0-3]):([0-5][0-9])(AM|PM)$)|(^([0-9]|[1][0-9]|[2][0-3])(AM|PM)$)/;
      var str = o.textValue();
      if (re.test(str)) {
        str = str.replace(/(AM|PM)/, " $1");
        o.textValue(str);
      }

    };
    var fixLeadingZero = function() {
      var re = /^0/;
      var str = o.textValue();
      if (re.test(str)) {
        str = str.replace(/^0+/, "");
        o.textValue(str);
      }
      return true;
    };
    var fixMissingColon = function() {
      var re = /:/;
      var reDigits = /^[0-9][0-9][0-9]/;
      var reThreeDigitsOnly = /^([0-9])([0-9][0-9])$/;
      var reFourDigits = /^([0-9][0-9])([0-9][0-9])$/;

      var str = o.textValue();
      if (!re.test(str)) {
        if (!reDigits.test(str)) return; //deal-breaker
        if (reThreeDigitsOnly.test(str)) {
          str = str.replace(reThreeDigitsOnly, "$1:$2");
          o.textValue(str);
          return;
        }
        if (reFourDigits.test(str)) {
          str = str.replace(reFourDigits, "$1:$2");
          o.textValue(str);
          return;
        }
      }
    };
    var fixMissingMeridian = function() {
      var strHourResult = null;
      var reMeridian = /(AM|PM)$/;
      var reOneDigitHour = /^([0-9])/;
      var reTwoDigitHour = /^([0-9][0-9])/;
      var str = o.textValue();
      if (!reMeridian.test(str)) {
        strHourResult = str.match(reTwoDigitHour);
        if (!strHourResult) {
          strHourResult = str.match(reOneDigitHour);
          if (!strHourResult) {
            return; //deal-breaker
          }
        }
        if (strHourResult[0] >= 7 && strHourResult[0] <= 11) {
          str += " AM";
        } else {
          str += " PM";
        }
        o.textValue(str);
      }
    };
    var fixMissingMinutes = function() {
      var re = /:[0-9][0-9]/;
      var reMeridian = /(AM|PM)$/;
      var str = o.textValue();

      if (!re.test(str)) {
        if (reMeridian.test(str)) {
          str = str.replace(reMeridian, ":00 $1");
          o.textValue(str);
        }
      }
    };
    var isEmpty = function() {
      if (!o || !o.textValue) return true;
      if (ppo.spaceTrim(o.textValue()) === "") return true;
      return false;
    };
    var setOptions = function(optionsObject) {
      if (typeof optionsObject == "undefined" || optionsObject === null) {
        optionsObject = {};
      }
      options.width = optionsObject.width ? optionsObject.width : null;
      options.height = optionsObject.height ? optionsObject.height : null;
      options.blankOnError = optionsObject.blankOnError ? optionsObject.blankOnError : false;
      options.errorClass = optionsObject.errorClass ? optionsObject.errorClass : "has-error has-error-bg";
      options.textBoxCssClass = optionsObject.textBoxCssClass ? optionsObject.textBoxCssClass : "form-control";
    };
    var detectElementType = function() {
      if (o.is("input")) {
        isDiv = false;
        isInput = true;
        o.textValue = o.val;
      }
      if (o.is("div")) {
        isDiv = true;
        isInput = false;
        o.textValue = o.text;
      }
    };
    o.mask = mask;
    return o;
  };