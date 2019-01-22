/**!
 * @fileOverview Kickass library to create and place poppers near their reference elements.
 * @version 1.14.4
 * @license
 * Copyright (c) 2016 Federico Zivolo and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Popper = factory());
}(this, (function () { 'use strict';

var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
var timeoutDuration = 0;
for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
  if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
    timeoutDuration = 1;
    break;
  }
}

function microtaskDebounce(fn) {
  var called = false;
  return function () {
    if (called) {
      return;
    }
    called = true;
    window.Promise.resolve().then(function () {
      called = false;
      fn();
    });
  };
}

function taskDebounce(fn) {
  var scheduled = false;
  return function () {
    if (!scheduled) {
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        fn();
      }, timeoutDuration);
    }
  };
}

var supportsMicroTasks = isBrowser && window.Promise;

/**
* Create a debounced version of a method, that's asynchronously deferred
* but called in the minimum time possible.
*
* @method
* @memberof Popper.Utils
* @argument {Function} fn
* @returns {Function}
*/
var debounce = supportsMicroTasks ? microtaskDebounce : taskDebounce;

/**
 * Check if the given variable is a function
 * @method
 * @memberof Popper.Utils
 * @argument {Any} functionToCheck - variable to check
 * @returns {Boolean} answer to: is a function?
 */
function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

/**
 * Get CSS computed property of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Eement} element
 * @argument {String} property
 */
function getStyleComputedProperty(element, property) {
  if (element.nodeType !== 1) {
    return [];
  }
  // NOTE: 1 DOM access here
  var css = getComputedStyle(element, null);
  return property ? css[property] : css;
}

/**
 * Returns the parentNode or the host of the element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} parent
 */
function getParentNode(element) {
  if (element.nodeName === 'HTML') {
    return element;
  }
  return element.parentNode || element.host;
}

/**
 * Returns the scrolling parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} scroll parent
 */
function getScrollParent(element) {
  // Return body, `getScroll` will take care to get the correct `scrollTop` from it
  if (!element) {
    return document.body;
  }

  switch (element.nodeName) {
    case 'HTML':
    case 'BODY':
      return element.ownerDocument.body;
    case '#document':
      return element.body;
  }

  // Firefox want us to check `-x` and `-y` variations as well

  var _getStyleComputedProp = getStyleComputedProperty(element),
      overflow = _getStyleComputedProp.overflow,
      overflowX = _getStyleComputedProp.overflowX,
      overflowY = _getStyleComputedProp.overflowY;

  if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
    return element;
  }

  return getScrollParent(getParentNode(element));
}

var isIE11 = isBrowser && !!(window.MSInputMethodContext && document.documentMode);
var isIE10 = isBrowser && /MSIE 10/.test(navigator.userAgent);

/**
 * Determines if the browser is Internet Explorer
 * @method
 * @memberof Popper.Utils
 * @param {Number} version to check
 * @returns {Boolean} isIE
 */
function isIE(version) {
  if (version === 11) {
    return isIE11;
  }
  if (version === 10) {
    return isIE10;
  }
  return isIE11 || isIE10;
}

/**
 * Returns the offset parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} offset parent
 */
function getOffsetParent(element) {
  if (!element) {
    return document.documentElement;
  }

  var noOffsetParent = isIE(10) ? document.body : null;

  // NOTE: 1 DOM access here
  var offsetParent = element.offsetParent;
  // Skip hidden elements which don't have an offsetParent
  while (offsetParent === noOffsetParent && element.nextElementSibling) {
    offsetParent = (element = element.nextElementSibling).offsetParent;
  }

  var nodeName = offsetParent && offsetParent.nodeName;

  if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
    return element ? element.ownerDocument.documentElement : document.documentElement;
  }

  // .offsetParent will return the closest TD or TABLE in case
  // no offsetParent is present, I hate this job...
  if (['TD', 'TABLE'].indexOf(offsetParent.nodeName) !== -1 && getStyleComputedProperty(offsetParent, 'position') === 'static') {
    return getOffsetParent(offsetParent);
  }

  return offsetParent;
}

function isOffsetContainer(element) {
  var nodeName = element.nodeName;

  if (nodeName === 'BODY') {
    return false;
  }
  return nodeName === 'HTML' || getOffsetParent(element.firstElementChild) === element;
}

/**
 * Finds the root node (document, shadowDOM root) of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} node
 * @returns {Element} root node
 */
function getRoot(node) {
  if (node.parentNode !== null) {
    return getRoot(node.parentNode);
  }

  return node;
}

/**
 * Finds the offset parent common to the two provided nodes
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element1
 * @argument {Element} element2
 * @returns {Element} common offset parent
 */
function findCommonOffsetParent(element1, element2) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
    return document.documentElement;
  }

  // Here we make sure to give as "start" the element that comes first in the DOM
  var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING;
  var start = order ? element1 : element2;
  var end = order ? element2 : element1;

  // Get common ancestor container
  var range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, 0);
  var commonAncestorContainer = range.commonAncestorContainer;

  // Both nodes are inside #document

  if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end)) {
    if (isOffsetContainer(commonAncestorContainer)) {
      return commonAncestorContainer;
    }

    return getOffsetParent(commonAncestorContainer);
  }

  // one of the nodes is inside shadowDOM, find which one
  var element1root = getRoot(element1);
  if (element1root.host) {
    return findCommonOffsetParent(element1root.host, element2);
  } else {
    return findCommonOffsetParent(element1, getRoot(element2).host);
  }
}

/**
 * Gets the scroll value of the given element in the given side (top and left)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {String} side `top` or `left`
 * @returns {number} amount of scrolled pixels
 */
function getScroll(element) {
  var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

  var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
  var nodeName = element.nodeName;

  if (nodeName === 'BODY' || nodeName === 'HTML') {
    var html = element.ownerDocument.documentElement;
    var scrollingElement = element.ownerDocument.scrollingElement || html;
    return scrollingElement[upperSide];
  }

  return element[upperSide];
}

/*
 * Sum or subtract the element scroll values (left and top) from a given rect object
 * @method
 * @memberof Popper.Utils
 * @param {Object} rect - Rect object you want to change
 * @param {HTMLElement} element - The element from the function reads the scroll values
 * @param {Boolean} subtract - set to true if you want to subtract the scroll values
 * @return {Object} rect - The modifier rect object
 */
function includeScroll(rect, element) {
  var subtract = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var scrollTop = getScroll(element, 'top');
  var scrollLeft = getScroll(element, 'left');
  var modifier = subtract ? -1 : 1;
  rect.top += scrollTop * modifier;
  rect.bottom += scrollTop * modifier;
  rect.left += scrollLeft * modifier;
  rect.right += scrollLeft * modifier;
  return rect;
}

/*
 * Helper to detect borders of a given element
 * @method
 * @memberof Popper.Utils
 * @param {CSSStyleDeclaration} styles
 * Result of `getStyleComputedProperty` on the given element
 * @param {String} axis - `x` or `y`
 * @return {number} borders - The borders size of the given axis
 */

function getBordersSize(styles, axis) {
  var sideA = axis === 'x' ? 'Left' : 'Top';
  var sideB = sideA === 'Left' ? 'Right' : 'Bottom';

  return parseFloat(styles['border' + sideA + 'Width'], 10) + parseFloat(styles['border' + sideB + 'Width'], 10);
}

function getSize(axis, body, html, computedStyle) {
  return Math.max(body['offset' + axis], body['scroll' + axis], html['client' + axis], html['offset' + axis], html['scroll' + axis], isIE(10) ? parseInt(html['offset' + axis]) + parseInt(computedStyle['margin' + (axis === 'Height' ? 'Top' : 'Left')]) + parseInt(computedStyle['margin' + (axis === 'Height' ? 'Bottom' : 'Right')]) : 0);
}

function getWindowSizes(document) {
  var body = document.body;
  var html = document.documentElement;
  var computedStyle = isIE(10) && getComputedStyle(html);

  return {
    height: getSize('Height', body, html, computedStyle),
    width: getSize('Width', body, html, computedStyle)
  };
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

/**
 * Given element offsets, generate an output similar to getBoundingClientRect
 * @method
 * @memberof Popper.Utils
 * @argument {Object} offsets
 * @returns {Object} ClientRect like output
 */
function getClientRect(offsets) {
  return _extends({}, offsets, {
    right: offsets.left + offsets.width,
    bottom: offsets.top + offsets.height
  });
}

/**
 * Get bounding client rect of given element
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @return {Object} client rect
 */
function getBoundingClientRect(element) {
  var rect = {};

  // IE10 10 FIX: Please, don't ask, the element isn't
  // considered in DOM in some circumstances...
  // This isn't reproducible in IE10 compatibility mode of IE11
  try {
    if (isIE(10)) {
      rect = element.getBoundingClientRect();
      var scrollTop = getScroll(element, 'top');
      var scrollLeft = getScroll(element, 'left');
      rect.top += scrollTop;
      rect.left += scrollLeft;
      rect.bottom += scrollTop;
      rect.right += scrollLeft;
    } else {
      rect = element.getBoundingClientRect();
    }
  } catch (e) {}

  var result = {
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  };

  // subtract scrollbar size from sizes
  var sizes = element.nodeName === 'HTML' ? getWindowSizes(element.ownerDocument) : {};
  var width = sizes.width || element.clientWidth || result.right - result.left;
  var height = sizes.height || element.clientHeight || result.bottom - result.top;

  var horizScrollbar = element.offsetWidth - width;
  var vertScrollbar = element.offsetHeight - height;

  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
  // we make this check conditional for performance reasons
  if (horizScrollbar || vertScrollbar) {
    var styles = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles, 'x');
    vertScrollbar -= getBordersSize(styles, 'y');

    result.width -= horizScrollbar;
    result.height -= vertScrollbar;
  }

  return getClientRect(result);
}

function getOffsetRectRelativeToArbitraryNode(children, parent) {
  var fixedPosition = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var isIE10 = isIE(10);
  var isHTML = parent.nodeName === 'HTML';
  var childrenRect = getBoundingClientRect(children);
  var parentRect = getBoundingClientRect(parent);
  var scrollParent = getScrollParent(children);

  var styles = getStyleComputedProperty(parent);
  var borderTopWidth = parseFloat(styles.borderTopWidth, 10);
  var borderLeftWidth = parseFloat(styles.borderLeftWidth, 10);

  // In cases where the parent is fixed, we must ignore negative scroll in offset calc
  if (fixedPosition && isHTML) {
    parentRect.top = Math.max(parentRect.top, 0);
    parentRect.left = Math.max(parentRect.left, 0);
  }
  var offsets = getClientRect({
    top: childrenRect.top - parentRect.top - borderTopWidth,
    left: childrenRect.left - parentRect.left - borderLeftWidth,
    width: childrenRect.width,
    height: childrenRect.height
  });
  offsets.marginTop = 0;
  offsets.marginLeft = 0;

  // Subtract margins of documentElement in case it's being used as parent
  // we do this only on HTML because it's the only element that behaves
  // differently when margins are applied to it. The margins are included in
  // the box of the documentElement, in the other cases not.
  if (!isIE10 && isHTML) {
    var marginTop = parseFloat(styles.marginTop, 10);
    var marginLeft = parseFloat(styles.marginLeft, 10);

    offsets.top -= borderTopWidth - marginTop;
    offsets.bottom -= borderTopWidth - marginTop;
    offsets.left -= borderLeftWidth - marginLeft;
    offsets.right -= borderLeftWidth - marginLeft;

    // Attach marginTop and marginLeft because in some circumstances we may need them
    offsets.marginTop = marginTop;
    offsets.marginLeft = marginLeft;
  }

  if (isIE10 && !fixedPosition ? parent.contains(scrollParent) : parent === scrollParent && scrollParent.nodeName !== 'BODY') {
    offsets = includeScroll(offsets, parent);
  }

  return offsets;
}

function getViewportOffsetRectRelativeToArtbitraryNode(element) {
  var excludeScroll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var html = element.ownerDocument.documentElement;
  var relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
  var width = Math.max(html.clientWidth, window.innerWidth || 0);
  var height = Math.max(html.clientHeight, window.innerHeight || 0);

  var scrollTop = !excludeScroll ? getScroll(html) : 0;
  var scrollLeft = !excludeScroll ? getScroll(html, 'left') : 0;

  var offset = {
    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
    width: width,
    height: height
  };

  return getClientRect(offset);
}

/**
 * Check if the given element is fixed or is inside a fixed parent
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {Element} customContainer
 * @returns {Boolean} answer to "isFixed?"
 */
function isFixed(element) {
  var nodeName = element.nodeName;
  if (nodeName === 'BODY' || nodeName === 'HTML') {
    return false;
  }
  if (getStyleComputedProperty(element, 'position') === 'fixed') {
    return true;
  }
  return isFixed(getParentNode(element));
}

/**
 * Finds the first parent of an element that has a transformed property defined
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} first transformed parent or documentElement
 */

function getFixedPositionOffsetParent(element) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element || !element.parentElement || isIE()) {
    return document.documentElement;
  }
  var el = element.parentElement;
  while (el && getStyleComputedProperty(el, 'transform') === 'none') {
    el = el.parentElement;
  }
  return el || document.documentElement;
}

/**
 * Computed the boundaries limits and return them
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} popper
 * @param {HTMLElement} reference
 * @param {number} padding
 * @param {HTMLElement} boundariesElement - Element used to define the boundaries
 * @param {Boolean} fixedPosition - Is in fixed position mode
 * @returns {Object} Coordinates of the boundaries
 */
function getBoundaries(popper, reference, padding, boundariesElement) {
  var fixedPosition = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

  // NOTE: 1 DOM access here

  var boundaries = { top: 0, left: 0 };
  var offsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);

  // Handle viewport case
  if (boundariesElement === 'viewport') {
    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent, fixedPosition);
  } else {
    // Handle other cases based on DOM element used as boundaries
    var boundariesNode = void 0;
    if (boundariesElement === 'scrollParent') {
      boundariesNode = getScrollParent(getParentNode(reference));
      if (boundariesNode.nodeName === 'BODY') {
        boundariesNode = popper.ownerDocument.documentElement;
      }
    } else if (boundariesElement === 'window') {
      boundariesNode = popper.ownerDocument.documentElement;
    } else {
      boundariesNode = boundariesElement;
    }

    var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent, fixedPosition);

    // In case of HTML, we need a different computation
    if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
      var _getWindowSizes = getWindowSizes(popper.ownerDocument),
          height = _getWindowSizes.height,
          width = _getWindowSizes.width;

      boundaries.top += offsets.top - offsets.marginTop;
      boundaries.bottom = height + offsets.top;
      boundaries.left += offsets.left - offsets.marginLeft;
      boundaries.right = width + offsets.left;
    } else {
      // for all the other DOM elements, this one is good
      boundaries = offsets;
    }
  }

  // Add paddings
  padding = padding || 0;
  var isPaddingNumber = typeof padding === 'number';
  boundaries.left += isPaddingNumber ? padding : padding.left || 0;
  boundaries.top += isPaddingNumber ? padding : padding.top || 0;
  boundaries.right -= isPaddingNumber ? padding : padding.right || 0;
  boundaries.bottom -= isPaddingNumber ? padding : padding.bottom || 0;

  return boundaries;
}

function getArea(_ref) {
  var width = _ref.width,
      height = _ref.height;

  return width * height;
}

/**
 * Utility used to transform the `auto` placement to the placement with more
 * available space.
 * @method
 * @memberof Popper.Utils
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
  var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

  if (placement.indexOf('auto') === -1) {
    return placement;
  }

  var boundaries = getBoundaries(popper, reference, padding, boundariesElement);

  var rects = {
    top: {
      width: boundaries.width,
      height: refRect.top - boundaries.top
    },
    right: {
      width: boundaries.right - refRect.right,
      height: boundaries.height
    },
    bottom: {
      width: boundaries.width,
      height: boundaries.bottom - refRect.bottom
    },
    left: {
      width: refRect.left - boundaries.left,
      height: boundaries.height
    }
  };

  var sortedAreas = Object.keys(rects).map(function (key) {
    return _extends({
      key: key
    }, rects[key], {
      area: getArea(rects[key])
    });
  }).sort(function (a, b) {
    return b.area - a.area;
  });

  var filteredAreas = sortedAreas.filter(function (_ref2) {
    var width = _ref2.width,
        height = _ref2.height;
    return width >= popper.clientWidth && height >= popper.clientHeight;
  });

  var computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key;

  var variation = placement.split('-')[1];

  return computedPlacement + (variation ? '-' + variation : '');
}

/**
 * Get offsets to the reference element
 * @method
 * @memberof Popper.Utils
 * @param {Object} state
 * @param {Element} popper - the popper element
 * @param {Element} reference - the reference element (the popper will be relative to this)
 * @param {Element} fixedPosition - is in fixed position mode
 * @returns {Object} An object containing the offsets which will be applied to the popper
 */
function getReferenceOffsets(state, popper, reference) {
  var fixedPosition = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  var commonOffsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);
  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent, fixedPosition);
}

/**
 * Get the outer sizes of the given element (offset size + margins)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Object} object containing width and height properties
 */
function getOuterSizes(element) {
  var styles = getComputedStyle(element);
  var x = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
  var y = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
  var result = {
    width: element.offsetWidth + y,
    height: element.offsetHeight + x
  };
  return result;
}

/**
 * Get the opposite placement of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement
 * @returns {String} flipped placement
 */
function getOppositePlacement(placement) {
  var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

/**
 * Get offsets to the popper
 * @method
 * @memberof Popper.Utils
 * @param {Object} position - CSS position the Popper will get applied
 * @param {HTMLElement} popper - the popper element
 * @param {Object} referenceOffsets - the reference offsets (the popper will be relative to this)
 * @param {String} placement - one of the valid placement options
 * @returns {Object} popperOffsets - An object containing the offsets which will be applied to the popper
 */
function getPopperOffsets(popper, referenceOffsets, placement) {
  placement = placement.split('-')[0];

  // Get popper node sizes
  var popperRect = getOuterSizes(popper);

  // Add position, width and height to our offsets object
  var popperOffsets = {
    width: popperRect.width,
    height: popperRect.height
  };

  // depending by the popper placement we have to compute its offsets slightly differently
  var isHoriz = ['right', 'left'].indexOf(placement) !== -1;
  var mainSide = isHoriz ? 'top' : 'left';
  var secondarySide = isHoriz ? 'left' : 'top';
  var measurement = isHoriz ? 'height' : 'width';
  var secondaryMeasurement = !isHoriz ? 'height' : 'width';

  popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2;
  if (placement === secondarySide) {
    popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
  } else {
    popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)];
  }

  return popperOffsets;
}

/**
 * Mimics the `find` method of Array
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function find(arr, check) {
  // use native find if supported
  if (Array.prototype.find) {
    return arr.find(check);
  }

  // use `filter` to obtain the same behavior of `find`
  return arr.filter(check)[0];
}

/**
 * Return the index of the matching object
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function findIndex(arr, prop, value) {
  // use native findIndex if supported
  if (Array.prototype.findIndex) {
    return arr.findIndex(function (cur) {
      return cur[prop] === value;
    });
  }

  // use `find` + `indexOf` if `findIndex` isn't supported
  var match = find(arr, function (obj) {
    return obj[prop] === value;
  });
  return arr.indexOf(match);
}

/**
 * Loop trough the list of modifiers and run them in order,
 * each of them will then edit the data object.
 * @method
 * @memberof Popper.Utils
 * @param {dataObject} data
 * @param {Array} modifiers
 * @param {String} ends - Optional modifier name used as stopper
 * @returns {dataObject}
 */
function runModifiers(modifiers, data, ends) {
  var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

  modifiersToRun.forEach(function (modifier) {
    if (modifier['function']) {
      // eslint-disable-line dot-notation
      console.warn('`modifier.function` is deprecated, use `modifier.fn`!');
    }
    var fn = modifier['function'] || modifier.fn; // eslint-disable-line dot-notation
    if (modifier.enabled && isFunction(fn)) {
      // Add properties to offsets to make them a complete clientRect object
      // we do this before each modifier to make sure the previous one doesn't
      // mess with these values
      data.offsets.popper = getClientRect(data.offsets.popper);
      data.offsets.reference = getClientRect(data.offsets.reference);

      data = fn(data, modifier);
    }
  });

  return data;
}

/**
 * Updates the position of the popper, computing the new offsets and applying
 * the new style.<br />
 * Prefer `scheduleUpdate` over `update` because of performance reasons.
 * @method
 * @memberof Popper
 */
function update() {
  // if popper is destroyed, don't perform any further update
  if (this.state.isDestroyed) {
    return;
  }

  var data = {
    instance: this,
    styles: {},
    arrowStyles: {},
    attributes: {},
    flipped: false,
    offsets: {}
  };

  // compute reference element offsets
  data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference, this.options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding);

  // store the computed placement inside `originalPlacement`
  data.originalPlacement = data.placement;

  data.positionFixed = this.options.positionFixed;

  // compute the popper offsets
  data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement);

  data.offsets.popper.position = this.options.positionFixed ? 'fixed' : 'absolute';

  // run the modifiers
  data = runModifiers(this.modifiers, data);

  // the first `update` will call `onCreate` callback
  // the other ones will call `onUpdate` callback
  if (!this.state.isCreated) {
    this.state.isCreated = true;
    this.options.onCreate(data);
  } else {
    this.options.onUpdate(data);
  }
}

/**
 * Helper used to know if the given modifier is enabled.
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean}
 */
function isModifierEnabled(modifiers, modifierName) {
  return modifiers.some(function (_ref) {
    var name = _ref.name,
        enabled = _ref.enabled;
    return enabled && name === modifierName;
  });
}

/**
 * Get the prefixed supported property name
 * @method
 * @memberof Popper.Utils
 * @argument {String} property (camelCase)
 * @returns {String} prefixed property (camelCase or PascalCase, depending on the vendor prefix)
 */
function getSupportedPropertyName(property) {
  var prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
  var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

  for (var i = 0; i < prefixes.length; i++) {
    var prefix = prefixes[i];
    var toCheck = prefix ? '' + prefix + upperProp : property;
    if (typeof document.body.style[toCheck] !== 'undefined') {
      return toCheck;
    }
  }
  return null;
}

/**
 * Destroys the popper.
 * @method
 * @memberof Popper
 */
function destroy() {
  this.state.isDestroyed = true;

  // touch DOM only if `applyStyle` modifier is enabled
  if (isModifierEnabled(this.modifiers, 'applyStyle')) {
    this.popper.removeAttribute('x-placement');
    this.popper.style.position = '';
    this.popper.style.top = '';
    this.popper.style.left = '';
    this.popper.style.right = '';
    this.popper.style.bottom = '';
    this.popper.style.willChange = '';
    this.popper.style[getSupportedPropertyName('transform')] = '';
  }

  this.disableEventListeners();

  // remove the popper if user explicity asked for the deletion on destroy
  // do not use `remove` because IE11 doesn't support it
  if (this.options.removeOnDestroy) {
    this.popper.parentNode.removeChild(this.popper);
  }
  return this;
}

/**
 * Get the window associated with the element
 * @argument {Element} element
 * @returns {Window}
 */
function getWindow(element) {
  var ownerDocument = element.ownerDocument;
  return ownerDocument ? ownerDocument.defaultView : window;
}

function attachToScrollParents(scrollParent, event, callback, scrollParents) {
  var isBody = scrollParent.nodeName === 'BODY';
  var target = isBody ? scrollParent.ownerDocument.defaultView : scrollParent;
  target.addEventListener(event, callback, { passive: true });

  if (!isBody) {
    attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents);
  }
  scrollParents.push(target);
}

/**
 * Setup needed event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function setupEventListeners(reference, options, state, updateBound) {
  // Resize event listener on window
  state.updateBound = updateBound;
  getWindow(reference).addEventListener('resize', state.updateBound, { passive: true });

  // Scroll event listener on scroll parents
  var scrollElement = getScrollParent(reference);
  attachToScrollParents(scrollElement, 'scroll', state.updateBound, state.scrollParents);
  state.scrollElement = scrollElement;
  state.eventsEnabled = true;

  return state;
}

/**
 * It will add resize/scroll events and start recalculating
 * position of the popper element when they are triggered.
 * @method
 * @memberof Popper
 */
function enableEventListeners() {
  if (!this.state.eventsEnabled) {
    this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);
  }
}

/**
 * Remove event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function removeEventListeners(reference, state) {
  // Remove resize event listener on window
  getWindow(reference).removeEventListener('resize', state.updateBound);

  // Remove scroll event listener on scroll parents
  state.scrollParents.forEach(function (target) {
    target.removeEventListener('scroll', state.updateBound);
  });

  // Reset state
  state.updateBound = null;
  state.scrollParents = [];
  state.scrollElement = null;
  state.eventsEnabled = false;
  return state;
}

/**
 * It will remove resize/scroll events and won't recalculate popper position
 * when they are triggered. It also won't trigger `onUpdate` callback anymore,
 * unless you call `update` method manually.
 * @method
 * @memberof Popper
 */
function disableEventListeners() {
  if (this.state.eventsEnabled) {
    cancelAnimationFrame(this.scheduleUpdate);
    this.state = removeEventListeners(this.reference, this.state);
  }
}

/**
 * Tells if a given input is a number
 * @method
 * @memberof Popper.Utils
 * @param {*} input to check
 * @return {Boolean}
 */
function isNumeric(n) {
  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Set the style to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the style to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setStyles(element, styles) {
  Object.keys(styles).forEach(function (prop) {
    var unit = '';
    // add unit if the value is numeric and is one of the following
    if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
      unit = 'px';
    }
    element.style[prop] = styles[prop] + unit;
  });
}

/**
 * Set the attributes to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the attributes to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setAttributes(element, attributes) {
  Object.keys(attributes).forEach(function (prop) {
    var value = attributes[prop];
    if (value !== false) {
      element.setAttribute(prop, attributes[prop]);
    } else {
      element.removeAttribute(prop);
    }
  });
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} data.styles - List of style properties - values to apply to popper element
 * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The same data object
 */
function applyStyle(data) {
  // any property present in `data.styles` will be applied to the popper,
  // in this way we can make the 3rd party modifiers add custom styles to it
  // Be aware, modifiers could override the properties defined in the previous
  // lines of this modifier!
  setStyles(data.instance.popper, data.styles);

  // any property present in `data.attributes` will be applied to the popper,
  // they will be set as HTML attributes of the element
  setAttributes(data.instance.popper, data.attributes);

  // if arrowElement is defined and arrowStyles has some properties
  if (data.arrowElement && Object.keys(data.arrowStyles).length) {
    setStyles(data.arrowElement, data.arrowStyles);
  }

  return data;
}

/**
 * Set the x-placement attribute before everything else because it could be used
 * to add margins to the popper margins needs to be calculated to get the
 * correct popper offsets.
 * @method
 * @memberof Popper.modifiers
 * @param {HTMLElement} reference - The reference element used to position the popper
 * @param {HTMLElement} popper - The HTML element used as popper
 * @param {Object} options - Popper.js options
 */
function applyStyleOnLoad(reference, popper, options, modifierOptions, state) {
  // compute reference element offsets
  var referenceOffsets = getReferenceOffsets(state, popper, reference, options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  var placement = computeAutoPlacement(options.placement, referenceOffsets, popper, reference, options.modifiers.flip.boundariesElement, options.modifiers.flip.padding);

  popper.setAttribute('x-placement', placement);

  // Apply `position` to popper before anything else because
  // without the position applied we can't guarantee correct computations
  setStyles(popper, { position: options.positionFixed ? 'fixed' : 'absolute' });

  return options;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeStyle(data, options) {
  var x = options.x,
      y = options.y;
  var popper = data.offsets.popper;

  // Remove this legacy support in Popper.js v2

  var legacyGpuAccelerationOption = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'applyStyle';
  }).gpuAcceleration;
  if (legacyGpuAccelerationOption !== undefined) {
    console.warn('WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!');
  }
  var gpuAcceleration = legacyGpuAccelerationOption !== undefined ? legacyGpuAccelerationOption : options.gpuAcceleration;

  var offsetParent = getOffsetParent(data.instance.popper);
  var offsetParentRect = getBoundingClientRect(offsetParent);

  // Styles
  var styles = {
    position: popper.position
  };

  // Avoid blurry text by using full pixel integers.
  // For pixel-perfect positioning, top/bottom prefers rounded
  // values, while left/right prefers floored values.
  var offsets = {
    left: Math.floor(popper.left),
    top: Math.round(popper.top),
    bottom: Math.round(popper.bottom),
    right: Math.floor(popper.right)
  };

  var sideA = x === 'bottom' ? 'top' : 'bottom';
  var sideB = y === 'right' ? 'left' : 'right';

  // if gpuAcceleration is set to `true` and transform is supported,
  //  we use `translate3d` to apply the position to the popper we
  // automatically use the supported prefixed version if needed
  var prefixedProperty = getSupportedPropertyName('transform');

  // now, let's make a step back and look at this code closely (wtf?)
  // If the content of the popper grows once it's been positioned, it
  // may happen that the popper gets misplaced because of the new content
  // overflowing its reference element
  // To avoid this problem, we provide two options (x and y), which allow
  // the consumer to define the offset origin.
  // If we position a popper on top of a reference element, we can set
  // `x` to `top` to make the popper grow towards its top instead of
  // its bottom.
  var left = void 0,
      top = void 0;
  if (sideA === 'bottom') {
    // when offsetParent is <html> the positioning is relative to the bottom of the screen (excluding the scrollbar)
    // and not the bottom of the html element
    if (offsetParent.nodeName === 'HTML') {
      top = -offsetParent.clientHeight + offsets.bottom;
    } else {
      top = -offsetParentRect.height + offsets.bottom;
    }
  } else {
    top = offsets.top;
  }
  if (sideB === 'right') {
    if (offsetParent.nodeName === 'HTML') {
      left = -offsetParent.clientWidth + offsets.right;
    } else {
      left = -offsetParentRect.width + offsets.right;
    }
  } else {
    left = offsets.left;
  }
  if (gpuAcceleration && prefixedProperty) {
    styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
    styles[sideA] = 0;
    styles[sideB] = 0;
    styles.willChange = 'transform';
  } else {
    // othwerise, we use the standard `top`, `left`, `bottom` and `right` properties
    var invertTop = sideA === 'bottom' ? -1 : 1;
    var invertLeft = sideB === 'right' ? -1 : 1;
    styles[sideA] = top * invertTop;
    styles[sideB] = left * invertLeft;
    styles.willChange = sideA + ', ' + sideB;
  }

  // Attributes
  var attributes = {
    'x-placement': data.placement
  };

  // Update `data` attributes, styles and arrowStyles
  data.attributes = _extends({}, attributes, data.attributes);
  data.styles = _extends({}, styles, data.styles);
  data.arrowStyles = _extends({}, data.offsets.arrow, data.arrowStyles);

  return data;
}

/**
 * Helper used to know if the given modifier depends from another one.<br />
 * It checks if the needed modifier is listed and enabled.
 * @method
 * @memberof Popper.Utils
 * @param {Array} modifiers - list of modifiers
 * @param {String} requestingName - name of requesting modifier
 * @param {String} requestedName - name of requested modifier
 * @returns {Boolean}
 */
function isModifierRequired(modifiers, requestingName, requestedName) {
  var requesting = find(modifiers, function (_ref) {
    var name = _ref.name;
    return name === requestingName;
  });

  var isRequired = !!requesting && modifiers.some(function (modifier) {
    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
  });

  if (!isRequired) {
    var _requesting = '`' + requestingName + '`';
    var requested = '`' + requestedName + '`';
    console.warn(requested + ' modifier is required by ' + _requesting + ' modifier in order to work, be sure to include it before ' + _requesting + '!');
  }
  return isRequired;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function arrow(data, options) {
  var _data$offsets$arrow;

  // arrow depends on keepTogether in order to work
  if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
    return data;
  }

  var arrowElement = options.element;

  // if arrowElement is a string, suppose it's a CSS selector
  if (typeof arrowElement === 'string') {
    arrowElement = data.instance.popper.querySelector(arrowElement);

    // if arrowElement is not found, don't run the modifier
    if (!arrowElement) {
      return data;
    }
  } else {
    // if the arrowElement isn't a query selector we must check that the
    // provided DOM node is child of its popper node
    if (!data.instance.popper.contains(arrowElement)) {
      console.warn('WARNING: `arrow.element` must be child of its popper element!');
      return data;
    }
  }

  var placement = data.placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isVertical = ['left', 'right'].indexOf(placement) !== -1;

  var len = isVertical ? 'height' : 'width';
  var sideCapitalized = isVertical ? 'Top' : 'Left';
  var side = sideCapitalized.toLowerCase();
  var altSide = isVertical ? 'left' : 'top';
  var opSide = isVertical ? 'bottom' : 'right';
  var arrowElementSize = getOuterSizes(arrowElement)[len];

  //
  // extends keepTogether behavior making sure the popper and its
  // reference have enough pixels in conjunction
  //

  // top/left side
  if (reference[opSide] - arrowElementSize < popper[side]) {
    data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize);
  }
  // bottom/right side
  if (reference[side] + arrowElementSize > popper[opSide]) {
    data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide];
  }
  data.offsets.popper = getClientRect(data.offsets.popper);

  // compute center of the popper
  var center = reference[side] + reference[len] / 2 - arrowElementSize / 2;

  // Compute the sideValue using the updated popper offsets
  // take popper margin in account because we don't have this info available
  var css = getStyleComputedProperty(data.instance.popper);
  var popperMarginSide = parseFloat(css['margin' + sideCapitalized], 10);
  var popperBorderSide = parseFloat(css['border' + sideCapitalized + 'Width'], 10);
  var sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;

  // prevent arrowElement from being placed not contiguously to its popper
  sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);

  data.arrowElement = arrowElement;
  data.offsets.arrow = (_data$offsets$arrow = {}, defineProperty(_data$offsets$arrow, side, Math.round(sideValue)), defineProperty(_data$offsets$arrow, altSide, ''), _data$offsets$arrow);

  return data;
}

/**
 * Get the opposite placement variation of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement variation
 * @returns {String} flipped placement variation
 */
function getOppositeVariation(variation) {
  if (variation === 'end') {
    return 'start';
  } else if (variation === 'start') {
    return 'end';
  }
  return variation;
}

/**
 * List of accepted placements to use as values of the `placement` option.<br />
 * Valid placements are:
 * - `auto`
 * - `top`
 * - `right`
 * - `bottom`
 * - `left`
 *
 * Each placement can have a variation from this list:
 * - `-start`
 * - `-end`
 *
 * Variations are interpreted easily if you think of them as the left to right
 * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
 * is right.<br />
 * Vertically (`left` and `right`), `start` is top and `end` is bottom.
 *
 * Some valid examples are:
 * - `top-end` (on top of reference, right aligned)
 * - `right-start` (on right of reference, top aligned)
 * - `bottom` (on bottom, centered)
 * - `auto-end` (on the side with more space available, alignment depends by placement)
 *
 * @static
 * @type {Array}
 * @enum {String}
 * @readonly
 * @method placements
 * @memberof Popper
 */
var placements = ['auto-start', 'auto', 'auto-end', 'top-start', 'top', 'top-end', 'right-start', 'right', 'right-end', 'bottom-end', 'bottom', 'bottom-start', 'left-end', 'left', 'left-start'];

// Get rid of `auto` `auto-start` and `auto-end`
var validPlacements = placements.slice(3);

/**
 * Given an initial placement, returns all the subsequent placements
 * clockwise (or counter-clockwise).
 *
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement - A valid placement (it accepts variations)
 * @argument {Boolean} counter - Set to true to walk the placements counterclockwise
 * @returns {Array} placements including their variations
 */
function clockwise(placement) {
  var counter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var index = validPlacements.indexOf(placement);
  var arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
  return counter ? arr.reverse() : arr;
}

var BEHAVIORS = {
  FLIP: 'flip',
  CLOCKWISE: 'clockwise',
  COUNTERCLOCKWISE: 'counterclockwise'
};

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function flip(data, options) {
  // if `inner` modifier is enabled, we can't use the `flip` modifier
  if (isModifierEnabled(data.instance.modifiers, 'inner')) {
    return data;
  }

  if (data.flipped && data.placement === data.originalPlacement) {
    // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
    return data;
  }

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, options.boundariesElement, data.positionFixed);

  var placement = data.placement.split('-')[0];
  var placementOpposite = getOppositePlacement(placement);
  var variation = data.placement.split('-')[1] || '';

  var flipOrder = [];

  switch (options.behavior) {
    case BEHAVIORS.FLIP:
      flipOrder = [placement, placementOpposite];
      break;
    case BEHAVIORS.CLOCKWISE:
      flipOrder = clockwise(placement);
      break;
    case BEHAVIORS.COUNTERCLOCKWISE:
      flipOrder = clockwise(placement, true);
      break;
    default:
      flipOrder = options.behavior;
  }

  flipOrder.forEach(function (step, index) {
    if (placement !== step || flipOrder.length === index + 1) {
      return data;
    }

    placement = data.placement.split('-')[0];
    placementOpposite = getOppositePlacement(placement);

    var popperOffsets = data.offsets.popper;
    var refOffsets = data.offsets.reference;

    // using floor because the reference offsets may contain decimals we are not going to consider here
    var floor = Math.floor;
    var overlapsRef = placement === 'left' && floor(popperOffsets.right) > floor(refOffsets.left) || placement === 'right' && floor(popperOffsets.left) < floor(refOffsets.right) || placement === 'top' && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === 'bottom' && floor(popperOffsets.top) < floor(refOffsets.bottom);

    var overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
    var overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
    var overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
    var overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

    var overflowsBoundaries = placement === 'left' && overflowsLeft || placement === 'right' && overflowsRight || placement === 'top' && overflowsTop || placement === 'bottom' && overflowsBottom;

    // flip the variation if required
    var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
    var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && overflowsLeft || isVertical && variation === 'end' && overflowsRight || !isVertical && variation === 'start' && overflowsTop || !isVertical && variation === 'end' && overflowsBottom);

    if (overlapsRef || overflowsBoundaries || flippedVariation) {
      // this boolean to detect any flip loop
      data.flipped = true;

      if (overlapsRef || overflowsBoundaries) {
        placement = flipOrder[index + 1];
      }

      if (flippedVariation) {
        variation = getOppositeVariation(variation);
      }

      data.placement = placement + (variation ? '-' + variation : '');

      // this object contains `position`, we want to preserve it along with
      // any additional property we may add in the future
      data.offsets.popper = _extends({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement));

      data = runModifiers(data.instance.modifiers, data, 'flip');
    }
  });
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function keepTogether(data) {
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var placement = data.placement.split('-')[0];
  var floor = Math.floor;
  var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
  var side = isVertical ? 'right' : 'bottom';
  var opSide = isVertical ? 'left' : 'top';
  var measurement = isVertical ? 'width' : 'height';

  if (popper[side] < floor(reference[opSide])) {
    data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement];
  }
  if (popper[opSide] > floor(reference[side])) {
    data.offsets.popper[opSide] = floor(reference[side]);
  }

  return data;
}

/**
 * Converts a string containing value + unit into a px value number
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} str - Value + unit string
 * @argument {String} measurement - `height` or `width`
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @returns {Number|String}
 * Value in pixels, or original string if no values were extracted
 */
function toValue(str, measurement, popperOffsets, referenceOffsets) {
  // separate value from unit
  var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
  var value = +split[1];
  var unit = split[2];

  // If it's not a number it's an operator, I guess
  if (!value) {
    return str;
  }

  if (unit.indexOf('%') === 0) {
    var element = void 0;
    switch (unit) {
      case '%p':
        element = popperOffsets;
        break;
      case '%':
      case '%r':
      default:
        element = referenceOffsets;
    }

    var rect = getClientRect(element);
    return rect[measurement] / 100 * value;
  } else if (unit === 'vh' || unit === 'vw') {
    // if is a vh or vw, we calculate the size based on the viewport
    var size = void 0;
    if (unit === 'vh') {
      size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    } else {
      size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    }
    return size / 100 * value;
  } else {
    // if is an explicit pixel unit, we get rid of the unit and keep the value
    // if is an implicit unit, it's px, and we return just the value
    return value;
  }
}

/**
 * Parse an `offset` string to extrapolate `x` and `y` numeric offsets.
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} offset
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @argument {String} basePlacement
 * @returns {Array} a two cells array with x and y offsets in numbers
 */
function parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
  var offsets = [0, 0];

  // Use height if placement is left or right and index is 0 otherwise use width
  // in this way the first offset will use an axis and the second one
  // will use the other one
  var useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;

  // Split the offset string to obtain a list of values and operands
  // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
  var fragments = offset.split(/(\+|\-)/).map(function (frag) {
    return frag.trim();
  });

  // Detect if the offset string contains a pair of values or a single one
  // they could be separated by comma or space
  var divider = fragments.indexOf(find(fragments, function (frag) {
    return frag.search(/,|\s/) !== -1;
  }));

  if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
    console.warn('Offsets separated by white space(s) are deprecated, use a comma (,) instead.');
  }

  // If divider is found, we divide the list of values and operands to divide
  // them by ofset X and Y.
  var splitRegex = /\s*,\s*|\s+/;
  var ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];

  // Convert the values with units to absolute pixels to allow our computations
  ops = ops.map(function (op, index) {
    // Most of the units rely on the orientation of the popper
    var measurement = (index === 1 ? !useHeight : useHeight) ? 'height' : 'width';
    var mergeWithPrevious = false;
    return op
    // This aggregates any `+` or `-` sign that aren't considered operators
    // e.g.: 10 + +5 => [10, +, +5]
    .reduce(function (a, b) {
      if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
        a[a.length - 1] = b;
        mergeWithPrevious = true;
        return a;
      } else if (mergeWithPrevious) {
        a[a.length - 1] += b;
        mergeWithPrevious = false;
        return a;
      } else {
        return a.concat(b);
      }
    }, [])
    // Here we convert the string values into number values (in px)
    .map(function (str) {
      return toValue(str, measurement, popperOffsets, referenceOffsets);
    });
  });

  // Loop trough the offsets arrays and execute the operations
  ops.forEach(function (op, index) {
    op.forEach(function (frag, index2) {
      if (isNumeric(frag)) {
        offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
      }
    });
  });
  return offsets;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @argument {Number|String} options.offset=0
 * The offset value as described in the modifier description
 * @returns {Object} The data object, properly modified
 */
function offset(data, _ref) {
  var offset = _ref.offset;
  var placement = data.placement,
      _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var basePlacement = placement.split('-')[0];

  var offsets = void 0;
  if (isNumeric(+offset)) {
    offsets = [+offset, 0];
  } else {
    offsets = parseOffset(offset, popper, reference, basePlacement);
  }

  if (basePlacement === 'left') {
    popper.top += offsets[0];
    popper.left -= offsets[1];
  } else if (basePlacement === 'right') {
    popper.top += offsets[0];
    popper.left += offsets[1];
  } else if (basePlacement === 'top') {
    popper.left += offsets[0];
    popper.top -= offsets[1];
  } else if (basePlacement === 'bottom') {
    popper.left += offsets[0];
    popper.top += offsets[1];
  }

  data.popper = popper;
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function preventOverflow(data, options) {
  var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);

  // If offsetParent is the reference element, we really want to
  // go one step up and use the next offsetParent as reference to
  // avoid to make this modifier completely useless and look like broken
  if (data.instance.reference === boundariesElement) {
    boundariesElement = getOffsetParent(boundariesElement);
  }

  // NOTE: DOM access here
  // resets the popper's position so that the document size can be calculated excluding
  // the size of the popper element itself
  var transformProp = getSupportedPropertyName('transform');
  var popperStyles = data.instance.popper.style; // assignment to help minification
  var top = popperStyles.top,
      left = popperStyles.left,
      transform = popperStyles[transformProp];

  popperStyles.top = '';
  popperStyles.left = '';
  popperStyles[transformProp] = '';

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, boundariesElement, data.positionFixed);

  // NOTE: DOM access here
  // restores the original style properties after the offsets have been computed
  popperStyles.top = top;
  popperStyles.left = left;
  popperStyles[transformProp] = transform;

  options.boundaries = boundaries;

  var order = options.priority;
  var popper = data.offsets.popper;

  var check = {
    primary: function primary(placement) {
      var value = popper[placement];
      if (popper[placement] < boundaries[placement] && !options.escapeWithReference) {
        value = Math.max(popper[placement], boundaries[placement]);
      }
      return defineProperty({}, placement, value);
    },
    secondary: function secondary(placement) {
      var mainSide = placement === 'right' ? 'left' : 'top';
      var value = popper[mainSide];
      if (popper[placement] > boundaries[placement] && !options.escapeWithReference) {
        value = Math.min(popper[mainSide], boundaries[placement] - (placement === 'right' ? popper.width : popper.height));
      }
      return defineProperty({}, mainSide, value);
    }
  };

  order.forEach(function (placement) {
    var side = ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
    popper = _extends({}, popper, check[side](placement));
  });

  data.offsets.popper = popper;

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function shift(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var shiftvariation = placement.split('-')[1];

  // if shift shiftvariation is specified, run the modifier
  if (shiftvariation) {
    var _data$offsets = data.offsets,
        reference = _data$offsets.reference,
        popper = _data$offsets.popper;

    var isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
    var side = isVertical ? 'left' : 'top';
    var measurement = isVertical ? 'width' : 'height';

    var shiftOffsets = {
      start: defineProperty({}, side, reference[side]),
      end: defineProperty({}, side, reference[side] + reference[measurement] - popper[measurement])
    };

    data.offsets.popper = _extends({}, popper, shiftOffsets[shiftvariation]);
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function hide(data) {
  if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
    return data;
  }

  var refRect = data.offsets.reference;
  var bound = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'preventOverflow';
  }).boundaries;

  if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === true) {
      return data;
    }

    data.hide = true;
    data.attributes['x-out-of-boundaries'] = '';
  } else {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === false) {
      return data;
    }

    data.hide = false;
    data.attributes['x-out-of-boundaries'] = false;
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function inner(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;

  var subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;

  popper[isHoriz ? 'left' : 'top'] = reference[basePlacement] - (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);

  data.placement = getOppositePlacement(placement);
  data.offsets.popper = getClientRect(popper);

  return data;
}

/**
 * Modifier function, each modifier can have a function of this type assigned
 * to its `fn` property.<br />
 * These functions will be called on each update, this means that you must
 * make sure they are performant enough to avoid performance bottlenecks.
 *
 * @function ModifierFn
 * @argument {dataObject} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {dataObject} The data object, properly modified
 */

/**
 * Modifiers are plugins used to alter the behavior of your poppers.<br />
 * Popper.js uses a set of 9 modifiers to provide all the basic functionalities
 * needed by the library.
 *
 * Usually you don't want to override the `order`, `fn` and `onLoad` props.
 * All the other properties are configurations that could be tweaked.
 * @namespace modifiers
 */
var modifiers = {
  /**
   * Modifier used to shift the popper on the start or end of its reference
   * element.<br />
   * It will read the variation of the `placement` property.<br />
   * It can be one either `-end` or `-start`.
   * @memberof modifiers
   * @inner
   */
  shift: {
    /** @prop {number} order=100 - Index used to define the order of execution */
    order: 100,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: shift
  },

  /**
   * The `offset` modifier can shift your popper on both its axis.
   *
   * It accepts the following units:
   * - `px` or unit-less, interpreted as pixels
   * - `%` or `%r`, percentage relative to the length of the reference element
   * - `%p`, percentage relative to the length of the popper element
   * - `vw`, CSS viewport width unit
   * - `vh`, CSS viewport height unit
   *
   * For length is intended the main axis relative to the placement of the popper.<br />
   * This means that if the placement is `top` or `bottom`, the length will be the
   * `width`. In case of `left` or `right`, it will be the `height`.
   *
   * You can provide a single value (as `Number` or `String`), or a pair of values
   * as `String` divided by a comma or one (or more) white spaces.<br />
   * The latter is a deprecated method because it leads to confusion and will be
   * removed in v2.<br />
   * Additionally, it accepts additions and subtractions between different units.
   * Note that multiplications and divisions aren't supported.
   *
   * Valid examples are:
   * ```
   * 10
   * '10%'
   * '10, 10'
   * '10%, 10'
   * '10 + 10%'
   * '10 - 5vh + 3%'
   * '-10px + 5vh, 5px - 6%'
   * ```
   * > **NB**: If you desire to apply offsets to your poppers in a way that may make them overlap
   * > with their reference element, unfortunately, you will have to disable the `flip` modifier.
   * > You can read more on this at this [issue](https://github.com/FezVrasta/popper.js/issues/373).
   *
   * @memberof modifiers
   * @inner
   */
  offset: {
    /** @prop {number} order=200 - Index used to define the order of execution */
    order: 200,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: offset,
    /** @prop {Number|String} offset=0
     * The offset value as described in the modifier description
     */
    offset: 0
  },

  /**
   * Modifier used to prevent the popper from being positioned outside the boundary.
   *
   * A scenario exists where the reference itself is not within the boundaries.<br />
   * We can say it has "escaped the boundaries" — or just "escaped".<br />
   * In this case we need to decide whether the popper should either:
   *
   * - detach from the reference and remain "trapped" in the boundaries, or
   * - if it should ignore the boundary and "escape with its reference"
   *
   * When `escapeWithReference` is set to`true` and reference is completely
   * outside its boundaries, the popper will overflow (or completely leave)
   * the boundaries in order to remain attached to the edge of the reference.
   *
   * @memberof modifiers
   * @inner
   */
  preventOverflow: {
    /** @prop {number} order=300 - Index used to define the order of execution */
    order: 300,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: preventOverflow,
    /**
     * @prop {Array} [priority=['left','right','top','bottom']]
     * Popper will try to prevent overflow following these priorities by default,
     * then, it could overflow on the left and on top of the `boundariesElement`
     */
    priority: ['left', 'right', 'top', 'bottom'],
    /**
     * @prop {number} padding=5
     * Amount of pixel used to define a minimum distance between the boundaries
     * and the popper. This makes sure the popper always has a little padding
     * between the edges of its container
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='scrollParent'
     * Boundaries used by the modifier. Can be `scrollParent`, `window`,
     * `viewport` or any DOM element.
     */
    boundariesElement: 'scrollParent'
  },

  /**
   * Modifier used to make sure the reference and its popper stay near each other
   * without leaving any gap between the two. Especially useful when the arrow is
   * enabled and you want to ensure that it points to its reference element.
   * It cares only about the first axis. You can still have poppers with margin
   * between the popper and its reference element.
   * @memberof modifiers
   * @inner
   */
  keepTogether: {
    /** @prop {number} order=400 - Index used to define the order of execution */
    order: 400,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: keepTogether
  },

  /**
   * This modifier is used to move the `arrowElement` of the popper to make
   * sure it is positioned between the reference element and its popper element.
   * It will read the outer size of the `arrowElement` node to detect how many
   * pixels of conjunction are needed.
   *
   * It has no effect if no `arrowElement` is provided.
   * @memberof modifiers
   * @inner
   */
  arrow: {
    /** @prop {number} order=500 - Index used to define the order of execution */
    order: 500,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: arrow,
    /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
    element: '[x-arrow]'
  },

  /**
   * Modifier used to flip the popper's placement when it starts to overlap its
   * reference element.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   *
   * **NOTE:** this modifier will interrupt the current update cycle and will
   * restart it if it detects the need to flip the placement.
   * @memberof modifiers
   * @inner
   */
  flip: {
    /** @prop {number} order=600 - Index used to define the order of execution */
    order: 600,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: flip,
    /**
     * @prop {String|Array} behavior='flip'
     * The behavior used to change the popper's placement. It can be one of
     * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
     * placements (with optional variations)
     */
    behavior: 'flip',
    /**
     * @prop {number} padding=5
     * The popper will flip if it hits the edges of the `boundariesElement`
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='viewport'
     * The element which will define the boundaries of the popper position.
     * The popper will never be placed outside of the defined boundaries
     * (except if `keepTogether` is enabled)
     */
    boundariesElement: 'viewport'
  },

  /**
   * Modifier used to make the popper flow toward the inner of the reference element.
   * By default, when this modifier is disabled, the popper will be placed outside
   * the reference element.
   * @memberof modifiers
   * @inner
   */
  inner: {
    /** @prop {number} order=700 - Index used to define the order of execution */
    order: 700,
    /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
    enabled: false,
    /** @prop {ModifierFn} */
    fn: inner
  },

  /**
   * Modifier used to hide the popper when its reference element is outside of the
   * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
   * be used to hide with a CSS selector the popper when its reference is
   * out of boundaries.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   * @memberof modifiers
   * @inner
   */
  hide: {
    /** @prop {number} order=800 - Index used to define the order of execution */
    order: 800,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: hide
  },

  /**
   * Computes the style that will be applied to the popper element to gets
   * properly positioned.
   *
   * Note that this modifier will not touch the DOM, it just prepares the styles
   * so that `applyStyle` modifier can apply it. This separation is useful
   * in case you need to replace `applyStyle` with a custom implementation.
   *
   * This modifier has `850` as `order` value to maintain backward compatibility
   * with previous versions of Popper.js. Expect the modifiers ordering method
   * to change in future major versions of the library.
   *
   * @memberof modifiers
   * @inner
   */
  computeStyle: {
    /** @prop {number} order=850 - Index used to define the order of execution */
    order: 850,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: computeStyle,
    /**
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3D transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties
     */
    gpuAcceleration: true,
    /**
     * @prop {string} [x='bottom']
     * Where to anchor the X axis (`bottom` or `top`). AKA X offset origin.
     * Change this if your popper should grow in a direction different from `bottom`
     */
    x: 'bottom',
    /**
     * @prop {string} [x='left']
     * Where to anchor the Y axis (`left` or `right`). AKA Y offset origin.
     * Change this if your popper should grow in a direction different from `right`
     */
    y: 'right'
  },

  /**
   * Applies the computed styles to the popper element.
   *
   * All the DOM manipulations are limited to this modifier. This is useful in case
   * you want to integrate Popper.js inside a framework or view library and you
   * want to delegate all the DOM manipulations to it.
   *
   * Note that if you disable this modifier, you must make sure the popper element
   * has its position set to `absolute` before Popper.js can do its work!
   *
   * Just disable this modifier and define your own to achieve the desired effect.
   *
   * @memberof modifiers
   * @inner
   */
  applyStyle: {
    /** @prop {number} order=900 - Index used to define the order of execution */
    order: 900,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: applyStyle,
    /** @prop {Function} */
    onLoad: applyStyleOnLoad,
    /**
     * @deprecated since version 1.10.0, the property moved to `computeStyle` modifier
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3D transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties
     */
    gpuAcceleration: undefined
  }
};

/**
 * The `dataObject` is an object containing all the information used by Popper.js.
 * This object is passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
 * @name dataObject
 * @property {Object} data.instance The Popper.js instance
 * @property {String} data.placement Placement applied to popper
 * @property {String} data.originalPlacement Placement originally defined on init
 * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
 * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper
 * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
 * @property {Object} data.styles Any CSS property defined here will be applied to the popper. It expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.arrowStyles Any CSS property defined here will be applied to the popper arrow. It expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.boundaries Offsets of the popper boundaries
 * @property {Object} data.offsets The measurements of popper, reference and arrow elements
 * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.arrow] `top` and `left` offsets, only one of them will be different from 0
 */

/**
 * Default options provided to Popper.js constructor.<br />
 * These can be overridden using the `options` argument of Popper.js.<br />
 * To override an option, simply pass an object with the same
 * structure of the `options` object, as the 3rd argument. For example:
 * ```
 * new Popper(ref, pop, {
 *   modifiers: {
 *     preventOverflow: { enabled: false }
 *   }
 * })
 * ```
 * @type {Object}
 * @static
 * @memberof Popper
 */
var Defaults = {
  /**
   * Popper's placement.
   * @prop {Popper.placements} placement='bottom'
   */
  placement: 'bottom',

  /**
   * Set this to true if you want popper to position it self in 'fixed' mode
   * @prop {Boolean} positionFixed=false
   */
  positionFixed: false,

  /**
   * Whether events (resize, scroll) are initially enabled.
   * @prop {Boolean} eventsEnabled=true
   */
  eventsEnabled: true,

  /**
   * Set to true if you want to automatically remove the popper when
   * you call the `destroy` method.
   * @prop {Boolean} removeOnDestroy=false
   */
  removeOnDestroy: false,

  /**
   * Callback called when the popper is created.<br />
   * By default, it is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onCreate}
   */
  onCreate: function onCreate() {},

  /**
   * Callback called when the popper is updated. This callback is not called
   * on the initialization/creation of the popper, but only on subsequent
   * updates.<br />
   * By default, it is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onUpdate}
   */
  onUpdate: function onUpdate() {},

  /**
   * List of modifiers used to modify the offsets before they are applied to the popper.
   * They provide most of the functionalities of Popper.js.
   * @prop {modifiers}
   */
  modifiers: modifiers
};

/**
 * @callback onCreate
 * @param {dataObject} data
 */

/**
 * @callback onUpdate
 * @param {dataObject} data
 */

// Utils
// Methods
var Popper = function () {
  /**
   * Creates a new Popper.js instance.
   * @class Popper
   * @param {HTMLElement|referenceObject} reference - The reference element used to position the popper
   * @param {HTMLElement} popper - The HTML element used as the popper
   * @param {Object} options - Your custom options to override the ones defined in [Defaults](#defaults)
   * @return {Object} instance - The generated Popper.js instance
   */
  function Popper(reference, popper) {
    var _this = this;

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    classCallCheck(this, Popper);

    this.scheduleUpdate = function () {
      return requestAnimationFrame(_this.update);
    };

    // make update() debounced, so that it only runs at most once-per-tick
    this.update = debounce(this.update.bind(this));

    // with {} we create a new object with the options inside it
    this.options = _extends({}, Popper.Defaults, options);

    // init state
    this.state = {
      isDestroyed: false,
      isCreated: false,
      scrollParents: []
    };

    // get reference and popper elements (allow jQuery wrappers)
    this.reference = reference && reference.jquery ? reference[0] : reference;
    this.popper = popper && popper.jquery ? popper[0] : popper;

    // Deep merge modifiers options
    this.options.modifiers = {};
    Object.keys(_extends({}, Popper.Defaults.modifiers, options.modifiers)).forEach(function (name) {
      _this.options.modifiers[name] = _extends({}, Popper.Defaults.modifiers[name] || {}, options.modifiers ? options.modifiers[name] : {});
    });

    // Refactoring modifiers' list (Object => Array)
    this.modifiers = Object.keys(this.options.modifiers).map(function (name) {
      return _extends({
        name: name
      }, _this.options.modifiers[name]);
    })
    // sort the modifiers by order
    .sort(function (a, b) {
      return a.order - b.order;
    });

    // modifiers have the ability to execute arbitrary code when Popper.js get inited
    // such code is executed in the same order of its modifier
    // they could add new properties to their options configuration
    // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
    this.modifiers.forEach(function (modifierOptions) {
      if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
        modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
      }
    });

    // fire the first update to position the popper in the right place
    this.update();

    var eventsEnabled = this.options.eventsEnabled;
    if (eventsEnabled) {
      // setup event listeners, they will take care of update the position in specific situations
      this.enableEventListeners();
    }

    this.state.eventsEnabled = eventsEnabled;
  }

  // We can't use class properties because they don't get listed in the
  // class prototype and break stuff like Sinon stubs


  createClass(Popper, [{
    key: 'update',
    value: function update$$1() {
      return update.call(this);
    }
  }, {
    key: 'destroy',
    value: function destroy$$1() {
      return destroy.call(this);
    }
  }, {
    key: 'enableEventListeners',
    value: function enableEventListeners$$1() {
      return enableEventListeners.call(this);
    }
  }, {
    key: 'disableEventListeners',
    value: function disableEventListeners$$1() {
      return disableEventListeners.call(this);
    }

    /**
     * Schedules an update. It will run on the next UI update available.
     * @method scheduleUpdate
     * @memberof Popper
     */


    /**
     * Collection of utilities useful when writing custom modifiers.
     * Starting from version 1.7, this method is available only if you
     * include `popper-utils.js` before `popper.js`.
     *
     * **DEPRECATION**: This way to access PopperUtils is deprecated
     * and will be removed in v2! Use the PopperUtils module directly instead.
     * Due to the high instability of the methods contained in Utils, we can't
     * guarantee them to follow semver. Use them at your own risk!
     * @static
     * @private
     * @type {Object}
     * @deprecated since version 1.8
     * @member Utils
     * @memberof Popper
     */

  }]);
  return Popper;
}();

/**
 * The `referenceObject` is an object that provides an interface compatible with Popper.js
 * and lets you use it as replacement of a real DOM node.<br />
 * You can use this method to position a popper relatively to a set of coordinates
 * in case you don't have a DOM node to use as reference.
 *
 * ```
 * new Popper(referenceObject, popperNode);
 * ```
 *
 * NB: This feature isn't supported in Internet Explorer 10.
 * @name referenceObject
 * @property {Function} data.getBoundingClientRect
 * A function that returns a set of coordinates compatible with the native `getBoundingClientRect` method.
 * @property {number} data.clientWidth
 * An ES6 getter that will return the width of the virtual reference element.
 * @property {number} data.clientHeight
 * An ES6 getter that will return the height of the virtual reference element.
 */


Popper.Utils = (typeof window !== 'undefined' ? window : global).PopperUtils;
Popper.placements = placements;
Popper.Defaults = Defaults;

return Popper;

})));
//# sourceMappingURL=popper.js.map

/*!
  * Bootstrap v4.1.3 (https://getbootstrap.com/)
  * Copyright 2011-2018 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('jquery'), require('popper.js')) :
  typeof define === 'function' && define.amd ? define(['exports', 'jquery', 'popper.js'], factory) :
  (factory((global.bootstrap = {}),global.jQuery,global.Popper));
}(this, (function (exports,$,Popper) { 'use strict';

  $ = $ && $.hasOwnProperty('default') ? $['default'] : $;
  Popper = Popper && Popper.hasOwnProperty('default') ? Popper['default'] : Popper;

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): util.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Util = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Private TransitionEnd Helpers
     * ------------------------------------------------------------------------
     */
    var TRANSITION_END = 'transitionend';
    var MAX_UID = 1000000;
    var MILLISECONDS_MULTIPLIER = 1000; // Shoutout AngusCroll (https://goo.gl/pxwQGp)

    function toType(obj) {
      return {}.toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
    }

    function getSpecialTransitionEndEvent() {
      return {
        bindType: TRANSITION_END,
        delegateType: TRANSITION_END,
        handle: function handle(event) {
          if ($$$1(event.target).is(this)) {
            return event.handleObj.handler.apply(this, arguments); // eslint-disable-line prefer-rest-params
          }

          return undefined; // eslint-disable-line no-undefined
        }
      };
    }

    function transitionEndEmulator(duration) {
      var _this = this;

      var called = false;
      $$$1(this).one(Util.TRANSITION_END, function () {
        called = true;
      });
      setTimeout(function () {
        if (!called) {
          Util.triggerTransitionEnd(_this);
        }
      }, duration);
      return this;
    }

    function setTransitionEndSupport() {
      $$$1.fn.emulateTransitionEnd = transitionEndEmulator;
      $$$1.event.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
    }
    /**
     * --------------------------------------------------------------------------
     * Public Util Api
     * --------------------------------------------------------------------------
     */


    var Util = {
      TRANSITION_END: 'bsTransitionEnd',
      getUID: function getUID(prefix) {
        do {
          // eslint-disable-next-line no-bitwise
          prefix += ~~(Math.random() * MAX_UID); // "~~" acts like a faster Math.floor() here
        } while (document.getElementById(prefix));

        return prefix;
      },
      getSelectorFromElement: function getSelectorFromElement(element) {
        var selector = element.getAttribute('data-target');

        if (!selector || selector === '#') {
          selector = element.getAttribute('href') || '';
        }

        try {
          return document.querySelector(selector) ? selector : null;
        } catch (err) {
          return null;
        }
      },
      getTransitionDurationFromElement: function getTransitionDurationFromElement(element) {
        if (!element) {
          return 0;
        } // Get transition-duration of the element


        var transitionDuration = $$$1(element).css('transition-duration');
        var floatTransitionDuration = parseFloat(transitionDuration); // Return 0 if element or transition duration is not found

        if (!floatTransitionDuration) {
          return 0;
        } // If multiple durations are defined, take the first


        transitionDuration = transitionDuration.split(',')[0];
        return parseFloat(transitionDuration) * MILLISECONDS_MULTIPLIER;
      },
      reflow: function reflow(element) {
        return element.offsetHeight;
      },
      triggerTransitionEnd: function triggerTransitionEnd(element) {
        $$$1(element).trigger(TRANSITION_END);
      },
      // TODO: Remove in v5
      supportsTransitionEnd: function supportsTransitionEnd() {
        return Boolean(TRANSITION_END);
      },
      isElement: function isElement(obj) {
        return (obj[0] || obj).nodeType;
      },
      typeCheckConfig: function typeCheckConfig(componentName, config, configTypes) {
        for (var property in configTypes) {
          if (Object.prototype.hasOwnProperty.call(configTypes, property)) {
            var expectedTypes = configTypes[property];
            var value = config[property];
            var valueType = value && Util.isElement(value) ? 'element' : toType(value);

            if (!new RegExp(expectedTypes).test(valueType)) {
              throw new Error(componentName.toUpperCase() + ": " + ("Option \"" + property + "\" provided type \"" + valueType + "\" ") + ("but expected type \"" + expectedTypes + "\"."));
            }
          }
        }
      }
    };
    setTransitionEndSupport();
    return Util;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): alert.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Alert = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'alert';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.alert';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Selector = {
      DISMISS: '[data-dismiss="alert"]'
    };
    var Event = {
      CLOSE: "close" + EVENT_KEY,
      CLOSED: "closed" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      ALERT: 'alert',
      FADE: 'fade',
      SHOW: 'show'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Alert =
    /*#__PURE__*/
    function () {
      function Alert(element) {
        this._element = element;
      } // Getters


      var _proto = Alert.prototype;

      // Public
      _proto.close = function close(element) {
        var rootElement = this._element;

        if (element) {
          rootElement = this._getRootElement(element);
        }

        var customEvent = this._triggerCloseEvent(rootElement);

        if (customEvent.isDefaultPrevented()) {
          return;
        }

        this._removeElement(rootElement);
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._element = null;
      }; // Private


      _proto._getRootElement = function _getRootElement(element) {
        var selector = Util.getSelectorFromElement(element);
        var parent = false;

        if (selector) {
          parent = document.querySelector(selector);
        }

        if (!parent) {
          parent = $$$1(element).closest("." + ClassName.ALERT)[0];
        }

        return parent;
      };

      _proto._triggerCloseEvent = function _triggerCloseEvent(element) {
        var closeEvent = $$$1.Event(Event.CLOSE);
        $$$1(element).trigger(closeEvent);
        return closeEvent;
      };

      _proto._removeElement = function _removeElement(element) {
        var _this = this;

        $$$1(element).removeClass(ClassName.SHOW);

        if (!$$$1(element).hasClass(ClassName.FADE)) {
          this._destroyElement(element);

          return;
        }

        var transitionDuration = Util.getTransitionDurationFromElement(element);
        $$$1(element).one(Util.TRANSITION_END, function (event) {
          return _this._destroyElement(element, event);
        }).emulateTransitionEnd(transitionDuration);
      };

      _proto._destroyElement = function _destroyElement(element) {
        $$$1(element).detach().trigger(Event.CLOSED).remove();
      }; // Static


      Alert._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $element = $$$1(this);
          var data = $element.data(DATA_KEY);

          if (!data) {
            data = new Alert(this);
            $element.data(DATA_KEY, data);
          }

          if (config === 'close') {
            data[config](this);
          }
        });
      };

      Alert._handleDismiss = function _handleDismiss(alertInstance) {
        return function (event) {
          if (event) {
            event.preventDefault();
          }

          alertInstance.close(this);
        };
      };

      _createClass(Alert, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }]);

      return Alert;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DISMISS, Alert._handleDismiss(new Alert()));
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Alert._jQueryInterface;
    $$$1.fn[NAME].Constructor = Alert;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Alert._jQueryInterface;
    };

    return Alert;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): button.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Button = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'button';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.button';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ClassName = {
      ACTIVE: 'active',
      BUTTON: 'btn',
      FOCUS: 'focus'
    };
    var Selector = {
      DATA_TOGGLE_CARROT: '[data-toggle^="button"]',
      DATA_TOGGLE: '[data-toggle="buttons"]',
      INPUT: 'input',
      ACTIVE: '.active',
      BUTTON: '.btn'
    };
    var Event = {
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY,
      FOCUS_BLUR_DATA_API: "focus" + EVENT_KEY + DATA_API_KEY + " " + ("blur" + EVENT_KEY + DATA_API_KEY)
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Button =
    /*#__PURE__*/
    function () {
      function Button(element) {
        this._element = element;
      } // Getters


      var _proto = Button.prototype;

      // Public
      _proto.toggle = function toggle() {
        var triggerChangeEvent = true;
        var addAriaPressed = true;
        var rootElement = $$$1(this._element).closest(Selector.DATA_TOGGLE)[0];

        if (rootElement) {
          var input = this._element.querySelector(Selector.INPUT);

          if (input) {
            if (input.type === 'radio') {
              if (input.checked && this._element.classList.contains(ClassName.ACTIVE)) {
                triggerChangeEvent = false;
              } else {
                var activeElement = rootElement.querySelector(Selector.ACTIVE);

                if (activeElement) {
                  $$$1(activeElement).removeClass(ClassName.ACTIVE);
                }
              }
            }

            if (triggerChangeEvent) {
              if (input.hasAttribute('disabled') || rootElement.hasAttribute('disabled') || input.classList.contains('disabled') || rootElement.classList.contains('disabled')) {
                return;
              }

              input.checked = !this._element.classList.contains(ClassName.ACTIVE);
              $$$1(input).trigger('change');
            }

            input.focus();
            addAriaPressed = false;
          }
        }

        if (addAriaPressed) {
          this._element.setAttribute('aria-pressed', !this._element.classList.contains(ClassName.ACTIVE));
        }

        if (triggerChangeEvent) {
          $$$1(this._element).toggleClass(ClassName.ACTIVE);
        }
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._element = null;
      }; // Static


      Button._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          if (!data) {
            data = new Button(this);
            $$$1(this).data(DATA_KEY, data);
          }

          if (config === 'toggle') {
            data[config]();
          }
        });
      };

      _createClass(Button, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }]);

      return Button;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
      event.preventDefault();
      var button = event.target;

      if (!$$$1(button).hasClass(ClassName.BUTTON)) {
        button = $$$1(button).closest(Selector.BUTTON);
      }

      Button._jQueryInterface.call($$$1(button), 'toggle');
    }).on(Event.FOCUS_BLUR_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
      var button = $$$1(event.target).closest(Selector.BUTTON)[0];
      $$$1(button).toggleClass(ClassName.FOCUS, /^focus(in)?$/.test(event.type));
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Button._jQueryInterface;
    $$$1.fn[NAME].Constructor = Button;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Button._jQueryInterface;
    };

    return Button;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): carousel.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Carousel = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'carousel';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.carousel';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ARROW_LEFT_KEYCODE = 37; // KeyboardEvent.which value for left arrow key

    var ARROW_RIGHT_KEYCODE = 39; // KeyboardEvent.which value for right arrow key

    var TOUCHEVENT_COMPAT_WAIT = 500; // Time for mouse compat events to fire after touch

    var Default = {
      interval: 5000,
      keyboard: true,
      slide: false,
      pause: 'hover',
      wrap: true
    };
    var DefaultType = {
      interval: '(number|boolean)',
      keyboard: 'boolean',
      slide: '(boolean|string)',
      pause: '(string|boolean)',
      wrap: 'boolean'
    };
    var Direction = {
      NEXT: 'next',
      PREV: 'prev',
      LEFT: 'left',
      RIGHT: 'right'
    };
    var Event = {
      SLIDE: "slide" + EVENT_KEY,
      SLID: "slid" + EVENT_KEY,
      KEYDOWN: "keydown" + EVENT_KEY,
      MOUSEENTER: "mouseenter" + EVENT_KEY,
      MOUSELEAVE: "mouseleave" + EVENT_KEY,
      TOUCHEND: "touchend" + EVENT_KEY,
      LOAD_DATA_API: "load" + EVENT_KEY + DATA_API_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      CAROUSEL: 'carousel',
      ACTIVE: 'active',
      SLIDE: 'slide',
      RIGHT: 'carousel-item-right',
      LEFT: 'carousel-item-left',
      NEXT: 'carousel-item-next',
      PREV: 'carousel-item-prev',
      ITEM: 'carousel-item'
    };
    var Selector = {
      ACTIVE: '.active',
      ACTIVE_ITEM: '.active.carousel-item',
      ITEM: '.carousel-item',
      NEXT_PREV: '.carousel-item-next, .carousel-item-prev',
      INDICATORS: '.carousel-indicators',
      DATA_SLIDE: '[data-slide], [data-slide-to]',
      DATA_RIDE: '[data-ride="carousel"]'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Carousel =
    /*#__PURE__*/
    function () {
      function Carousel(element, config) {
        this._items = null;
        this._interval = null;
        this._activeElement = null;
        this._isPaused = false;
        this._isSliding = false;
        this.touchTimeout = null;
        this._config = this._getConfig(config);
        this._element = $$$1(element)[0];
        this._indicatorsElement = this._element.querySelector(Selector.INDICATORS);

        this._addEventListeners();
      } // Getters


      var _proto = Carousel.prototype;

      // Public
      _proto.next = function next() {
        if (!this._isSliding) {
          this._slide(Direction.NEXT);
        }
      };

      _proto.nextWhenVisible = function nextWhenVisible() {
        // Don't call next when the page isn't visible
        // or the carousel or its parent isn't visible
        if (!document.hidden && $$$1(this._element).is(':visible') && $$$1(this._element).css('visibility') !== 'hidden') {
          this.next();
        }
      };

      _proto.prev = function prev() {
        if (!this._isSliding) {
          this._slide(Direction.PREV);
        }
      };

      _proto.pause = function pause(event) {
        if (!event) {
          this._isPaused = true;
        }

        if (this._element.querySelector(Selector.NEXT_PREV)) {
          Util.triggerTransitionEnd(this._element);
          this.cycle(true);
        }

        clearInterval(this._interval);
        this._interval = null;
      };

      _proto.cycle = function cycle(event) {
        if (!event) {
          this._isPaused = false;
        }

        if (this._interval) {
          clearInterval(this._interval);
          this._interval = null;
        }

        if (this._config.interval && !this._isPaused) {
          this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval);
        }
      };

      _proto.to = function to(index) {
        var _this = this;

        this._activeElement = this._element.querySelector(Selector.ACTIVE_ITEM);

        var activeIndex = this._getItemIndex(this._activeElement);

        if (index > this._items.length - 1 || index < 0) {
          return;
        }

        if (this._isSliding) {
          $$$1(this._element).one(Event.SLID, function () {
            return _this.to(index);
          });
          return;
        }

        if (activeIndex === index) {
          this.pause();
          this.cycle();
          return;
        }

        var direction = index > activeIndex ? Direction.NEXT : Direction.PREV;

        this._slide(direction, this._items[index]);
      };

      _proto.dispose = function dispose() {
        $$$1(this._element).off(EVENT_KEY);
        $$$1.removeData(this._element, DATA_KEY);
        this._items = null;
        this._config = null;
        this._element = null;
        this._interval = null;
        this._isPaused = null;
        this._isSliding = null;
        this._activeElement = null;
        this._indicatorsElement = null;
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._addEventListeners = function _addEventListeners() {
        var _this2 = this;

        if (this._config.keyboard) {
          $$$1(this._element).on(Event.KEYDOWN, function (event) {
            return _this2._keydown(event);
          });
        }

        if (this._config.pause === 'hover') {
          $$$1(this._element).on(Event.MOUSEENTER, function (event) {
            return _this2.pause(event);
          }).on(Event.MOUSELEAVE, function (event) {
            return _this2.cycle(event);
          });

          if ('ontouchstart' in document.documentElement) {
            // If it's a touch-enabled device, mouseenter/leave are fired as
            // part of the mouse compatibility events on first tap - the carousel
            // would stop cycling until user tapped out of it;
            // here, we listen for touchend, explicitly pause the carousel
            // (as if it's the second time we tap on it, mouseenter compat event
            // is NOT fired) and after a timeout (to allow for mouse compatibility
            // events to fire) we explicitly restart cycling
            $$$1(this._element).on(Event.TOUCHEND, function () {
              _this2.pause();

              if (_this2.touchTimeout) {
                clearTimeout(_this2.touchTimeout);
              }

              _this2.touchTimeout = setTimeout(function (event) {
                return _this2.cycle(event);
              }, TOUCHEVENT_COMPAT_WAIT + _this2._config.interval);
            });
          }
        }
      };

      _proto._keydown = function _keydown(event) {
        if (/input|textarea/i.test(event.target.tagName)) {
          return;
        }

        switch (event.which) {
          case ARROW_LEFT_KEYCODE:
            event.preventDefault();
            this.prev();
            break;

          case ARROW_RIGHT_KEYCODE:
            event.preventDefault();
            this.next();
            break;

          default:
        }
      };

      _proto._getItemIndex = function _getItemIndex(element) {
        this._items = element && element.parentNode ? [].slice.call(element.parentNode.querySelectorAll(Selector.ITEM)) : [];
        return this._items.indexOf(element);
      };

      _proto._getItemByDirection = function _getItemByDirection(direction, activeElement) {
        var isNextDirection = direction === Direction.NEXT;
        var isPrevDirection = direction === Direction.PREV;

        var activeIndex = this._getItemIndex(activeElement);

        var lastItemIndex = this._items.length - 1;
        var isGoingToWrap = isPrevDirection && activeIndex === 0 || isNextDirection && activeIndex === lastItemIndex;

        if (isGoingToWrap && !this._config.wrap) {
          return activeElement;
        }

        var delta = direction === Direction.PREV ? -1 : 1;
        var itemIndex = (activeIndex + delta) % this._items.length;
        return itemIndex === -1 ? this._items[this._items.length - 1] : this._items[itemIndex];
      };

      _proto._triggerSlideEvent = function _triggerSlideEvent(relatedTarget, eventDirectionName) {
        var targetIndex = this._getItemIndex(relatedTarget);

        var fromIndex = this._getItemIndex(this._element.querySelector(Selector.ACTIVE_ITEM));

        var slideEvent = $$$1.Event(Event.SLIDE, {
          relatedTarget: relatedTarget,
          direction: eventDirectionName,
          from: fromIndex,
          to: targetIndex
        });
        $$$1(this._element).trigger(slideEvent);
        return slideEvent;
      };

      _proto._setActiveIndicatorElement = function _setActiveIndicatorElement(element) {
        if (this._indicatorsElement) {
          var indicators = [].slice.call(this._indicatorsElement.querySelectorAll(Selector.ACTIVE));
          $$$1(indicators).removeClass(ClassName.ACTIVE);

          var nextIndicator = this._indicatorsElement.children[this._getItemIndex(element)];

          if (nextIndicator) {
            $$$1(nextIndicator).addClass(ClassName.ACTIVE);
          }
        }
      };

      _proto._slide = function _slide(direction, element) {
        var _this3 = this;

        var activeElement = this._element.querySelector(Selector.ACTIVE_ITEM);

        var activeElementIndex = this._getItemIndex(activeElement);

        var nextElement = element || activeElement && this._getItemByDirection(direction, activeElement);

        var nextElementIndex = this._getItemIndex(nextElement);

        var isCycling = Boolean(this._interval);
        var directionalClassName;
        var orderClassName;
        var eventDirectionName;

        if (direction === Direction.NEXT) {
          directionalClassName = ClassName.LEFT;
          orderClassName = ClassName.NEXT;
          eventDirectionName = Direction.LEFT;
        } else {
          directionalClassName = ClassName.RIGHT;
          orderClassName = ClassName.PREV;
          eventDirectionName = Direction.RIGHT;
        }

        if (nextElement && $$$1(nextElement).hasClass(ClassName.ACTIVE)) {
          this._isSliding = false;
          return;
        }

        var slideEvent = this._triggerSlideEvent(nextElement, eventDirectionName);

        if (slideEvent.isDefaultPrevented()) {
          return;
        }

        if (!activeElement || !nextElement) {
          // Some weirdness is happening, so we bail
          return;
        }

        this._isSliding = true;

        if (isCycling) {
          this.pause();
        }

        this._setActiveIndicatorElement(nextElement);

        var slidEvent = $$$1.Event(Event.SLID, {
          relatedTarget: nextElement,
          direction: eventDirectionName,
          from: activeElementIndex,
          to: nextElementIndex
        });

        if ($$$1(this._element).hasClass(ClassName.SLIDE)) {
          $$$1(nextElement).addClass(orderClassName);
          Util.reflow(nextElement);
          $$$1(activeElement).addClass(directionalClassName);
          $$$1(nextElement).addClass(directionalClassName);
          var transitionDuration = Util.getTransitionDurationFromElement(activeElement);
          $$$1(activeElement).one(Util.TRANSITION_END, function () {
            $$$1(nextElement).removeClass(directionalClassName + " " + orderClassName).addClass(ClassName.ACTIVE);
            $$$1(activeElement).removeClass(ClassName.ACTIVE + " " + orderClassName + " " + directionalClassName);
            _this3._isSliding = false;
            setTimeout(function () {
              return $$$1(_this3._element).trigger(slidEvent);
            }, 0);
          }).emulateTransitionEnd(transitionDuration);
        } else {
          $$$1(activeElement).removeClass(ClassName.ACTIVE);
          $$$1(nextElement).addClass(ClassName.ACTIVE);
          this._isSliding = false;
          $$$1(this._element).trigger(slidEvent);
        }

        if (isCycling) {
          this.cycle();
        }
      }; // Static


      Carousel._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = _objectSpread({}, Default, $$$1(this).data());

          if (typeof config === 'object') {
            _config = _objectSpread({}, _config, config);
          }

          var action = typeof config === 'string' ? config : _config.slide;

          if (!data) {
            data = new Carousel(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'number') {
            data.to(config);
          } else if (typeof action === 'string') {
            if (typeof data[action] === 'undefined') {
              throw new TypeError("No method named \"" + action + "\"");
            }

            data[action]();
          } else if (_config.interval) {
            data.pause();
            data.cycle();
          }
        });
      };

      Carousel._dataApiClickHandler = function _dataApiClickHandler(event) {
        var selector = Util.getSelectorFromElement(this);

        if (!selector) {
          return;
        }

        var target = $$$1(selector)[0];

        if (!target || !$$$1(target).hasClass(ClassName.CAROUSEL)) {
          return;
        }

        var config = _objectSpread({}, $$$1(target).data(), $$$1(this).data());

        var slideIndex = this.getAttribute('data-slide-to');

        if (slideIndex) {
          config.interval = false;
        }

        Carousel._jQueryInterface.call($$$1(target), config);

        if (slideIndex) {
          $$$1(target).data(DATA_KEY).to(slideIndex);
        }

        event.preventDefault();
      };

      _createClass(Carousel, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return Carousel;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_SLIDE, Carousel._dataApiClickHandler);
    $$$1(window).on(Event.LOAD_DATA_API, function () {
      var carousels = [].slice.call(document.querySelectorAll(Selector.DATA_RIDE));

      for (var i = 0, len = carousels.length; i < len; i++) {
        var $carousel = $$$1(carousels[i]);

        Carousel._jQueryInterface.call($carousel, $carousel.data());
      }
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Carousel._jQueryInterface;
    $$$1.fn[NAME].Constructor = Carousel;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Carousel._jQueryInterface;
    };

    return Carousel;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): collapse.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Collapse = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'collapse';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.collapse';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Default = {
      toggle: true,
      parent: ''
    };
    var DefaultType = {
      toggle: 'boolean',
      parent: '(string|element)'
    };
    var Event = {
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      SHOW: 'show',
      COLLAPSE: 'collapse',
      COLLAPSING: 'collapsing',
      COLLAPSED: 'collapsed'
    };
    var Dimension = {
      WIDTH: 'width',
      HEIGHT: 'height'
    };
    var Selector = {
      ACTIVES: '.show, .collapsing',
      DATA_TOGGLE: '[data-toggle="collapse"]'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Collapse =
    /*#__PURE__*/
    function () {
      function Collapse(element, config) {
        this._isTransitioning = false;
        this._element = element;
        this._config = this._getConfig(config);
        this._triggerArray = $$$1.makeArray(document.querySelectorAll("[data-toggle=\"collapse\"][href=\"#" + element.id + "\"]," + ("[data-toggle=\"collapse\"][data-target=\"#" + element.id + "\"]")));
        var toggleList = [].slice.call(document.querySelectorAll(Selector.DATA_TOGGLE));

        for (var i = 0, len = toggleList.length; i < len; i++) {
          var elem = toggleList[i];
          var selector = Util.getSelectorFromElement(elem);
          var filterElement = [].slice.call(document.querySelectorAll(selector)).filter(function (foundElem) {
            return foundElem === element;
          });

          if (selector !== null && filterElement.length > 0) {
            this._selector = selector;

            this._triggerArray.push(elem);
          }
        }

        this._parent = this._config.parent ? this._getParent() : null;

        if (!this._config.parent) {
          this._addAriaAndCollapsedClass(this._element, this._triggerArray);
        }

        if (this._config.toggle) {
          this.toggle();
        }
      } // Getters


      var _proto = Collapse.prototype;

      // Public
      _proto.toggle = function toggle() {
        if ($$$1(this._element).hasClass(ClassName.SHOW)) {
          this.hide();
        } else {
          this.show();
        }
      };

      _proto.show = function show() {
        var _this = this;

        if (this._isTransitioning || $$$1(this._element).hasClass(ClassName.SHOW)) {
          return;
        }

        var actives;
        var activesData;

        if (this._parent) {
          actives = [].slice.call(this._parent.querySelectorAll(Selector.ACTIVES)).filter(function (elem) {
            return elem.getAttribute('data-parent') === _this._config.parent;
          });

          if (actives.length === 0) {
            actives = null;
          }
        }

        if (actives) {
          activesData = $$$1(actives).not(this._selector).data(DATA_KEY);

          if (activesData && activesData._isTransitioning) {
            return;
          }
        }

        var startEvent = $$$1.Event(Event.SHOW);
        $$$1(this._element).trigger(startEvent);

        if (startEvent.isDefaultPrevented()) {
          return;
        }

        if (actives) {
          Collapse._jQueryInterface.call($$$1(actives).not(this._selector), 'hide');

          if (!activesData) {
            $$$1(actives).data(DATA_KEY, null);
          }
        }

        var dimension = this._getDimension();

        $$$1(this._element).removeClass(ClassName.COLLAPSE).addClass(ClassName.COLLAPSING);
        this._element.style[dimension] = 0;

        if (this._triggerArray.length) {
          $$$1(this._triggerArray).removeClass(ClassName.COLLAPSED).attr('aria-expanded', true);
        }

        this.setTransitioning(true);

        var complete = function complete() {
          $$$1(_this._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).addClass(ClassName.SHOW);
          _this._element.style[dimension] = '';

          _this.setTransitioning(false);

          $$$1(_this._element).trigger(Event.SHOWN);
        };

        var capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
        var scrollSize = "scroll" + capitalizedDimension;
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $$$1(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        this._element.style[dimension] = this._element[scrollSize] + "px";
      };

      _proto.hide = function hide() {
        var _this2 = this;

        if (this._isTransitioning || !$$$1(this._element).hasClass(ClassName.SHOW)) {
          return;
        }

        var startEvent = $$$1.Event(Event.HIDE);
        $$$1(this._element).trigger(startEvent);

        if (startEvent.isDefaultPrevented()) {
          return;
        }

        var dimension = this._getDimension();

        this._element.style[dimension] = this._element.getBoundingClientRect()[dimension] + "px";
        Util.reflow(this._element);
        $$$1(this._element).addClass(ClassName.COLLAPSING).removeClass(ClassName.COLLAPSE).removeClass(ClassName.SHOW);
        var triggerArrayLength = this._triggerArray.length;

        if (triggerArrayLength > 0) {
          for (var i = 0; i < triggerArrayLength; i++) {
            var trigger = this._triggerArray[i];
            var selector = Util.getSelectorFromElement(trigger);

            if (selector !== null) {
              var $elem = $$$1([].slice.call(document.querySelectorAll(selector)));

              if (!$elem.hasClass(ClassName.SHOW)) {
                $$$1(trigger).addClass(ClassName.COLLAPSED).attr('aria-expanded', false);
              }
            }
          }
        }

        this.setTransitioning(true);

        var complete = function complete() {
          _this2.setTransitioning(false);

          $$$1(_this2._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).trigger(Event.HIDDEN);
        };

        this._element.style[dimension] = '';
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $$$1(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      };

      _proto.setTransitioning = function setTransitioning(isTransitioning) {
        this._isTransitioning = isTransitioning;
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._config = null;
        this._parent = null;
        this._element = null;
        this._triggerArray = null;
        this._isTransitioning = null;
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        config.toggle = Boolean(config.toggle); // Coerce string values

        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._getDimension = function _getDimension() {
        var hasWidth = $$$1(this._element).hasClass(Dimension.WIDTH);
        return hasWidth ? Dimension.WIDTH : Dimension.HEIGHT;
      };

      _proto._getParent = function _getParent() {
        var _this3 = this;

        var parent = null;

        if (Util.isElement(this._config.parent)) {
          parent = this._config.parent; // It's a jQuery object

          if (typeof this._config.parent.jquery !== 'undefined') {
            parent = this._config.parent[0];
          }
        } else {
          parent = document.querySelector(this._config.parent);
        }

        var selector = "[data-toggle=\"collapse\"][data-parent=\"" + this._config.parent + "\"]";
        var children = [].slice.call(parent.querySelectorAll(selector));
        $$$1(children).each(function (i, element) {
          _this3._addAriaAndCollapsedClass(Collapse._getTargetFromElement(element), [element]);
        });
        return parent;
      };

      _proto._addAriaAndCollapsedClass = function _addAriaAndCollapsedClass(element, triggerArray) {
        if (element) {
          var isOpen = $$$1(element).hasClass(ClassName.SHOW);

          if (triggerArray.length) {
            $$$1(triggerArray).toggleClass(ClassName.COLLAPSED, !isOpen).attr('aria-expanded', isOpen);
          }
        }
      }; // Static


      Collapse._getTargetFromElement = function _getTargetFromElement(element) {
        var selector = Util.getSelectorFromElement(element);
        return selector ? document.querySelector(selector) : null;
      };

      Collapse._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $this = $$$1(this);
          var data = $this.data(DATA_KEY);

          var _config = _objectSpread({}, Default, $this.data(), typeof config === 'object' && config ? config : {});

          if (!data && _config.toggle && /show|hide/.test(config)) {
            _config.toggle = false;
          }

          if (!data) {
            data = new Collapse(this, _config);
            $this.data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Collapse, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return Collapse;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      // preventDefault only for <a> elements (which change the URL) not inside the collapsible element
      if (event.currentTarget.tagName === 'A') {
        event.preventDefault();
      }

      var $trigger = $$$1(this);
      var selector = Util.getSelectorFromElement(this);
      var selectors = [].slice.call(document.querySelectorAll(selector));
      $$$1(selectors).each(function () {
        var $target = $$$1(this);
        var data = $target.data(DATA_KEY);
        var config = data ? 'toggle' : $trigger.data();

        Collapse._jQueryInterface.call($target, config);
      });
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Collapse._jQueryInterface;
    $$$1.fn[NAME].Constructor = Collapse;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Collapse._jQueryInterface;
    };

    return Collapse;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): dropdown.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Dropdown = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'dropdown';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.dropdown';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

    var SPACE_KEYCODE = 32; // KeyboardEvent.which value for space key

    var TAB_KEYCODE = 9; // KeyboardEvent.which value for tab key

    var ARROW_UP_KEYCODE = 38; // KeyboardEvent.which value for up arrow key

    var ARROW_DOWN_KEYCODE = 40; // KeyboardEvent.which value for down arrow key

    var RIGHT_MOUSE_BUTTON_WHICH = 3; // MouseEvent.which value for the right button (assuming a right-handed mouse)

    var REGEXP_KEYDOWN = new RegExp(ARROW_UP_KEYCODE + "|" + ARROW_DOWN_KEYCODE + "|" + ESCAPE_KEYCODE);
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      CLICK: "click" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY,
      KEYDOWN_DATA_API: "keydown" + EVENT_KEY + DATA_API_KEY,
      KEYUP_DATA_API: "keyup" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      DISABLED: 'disabled',
      SHOW: 'show',
      DROPUP: 'dropup',
      DROPRIGHT: 'dropright',
      DROPLEFT: 'dropleft',
      MENURIGHT: 'dropdown-menu-right',
      MENULEFT: 'dropdown-menu-left',
      POSITION_STATIC: 'position-static'
    };
    var Selector = {
      DATA_TOGGLE: '[data-toggle="dropdown"]',
      FORM_CHILD: '.dropdown form',
      MENU: '.dropdown-menu',
      NAVBAR_NAV: '.navbar-nav',
      VISIBLE_ITEMS: '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)'
    };
    var AttachmentMap = {
      TOP: 'top-start',
      TOPEND: 'top-end',
      BOTTOM: 'bottom-start',
      BOTTOMEND: 'bottom-end',
      RIGHT: 'right-start',
      RIGHTEND: 'right-end',
      LEFT: 'left-start',
      LEFTEND: 'left-end'
    };
    var Default = {
      offset: 0,
      flip: true,
      boundary: 'scrollParent',
      reference: 'toggle',
      display: 'dynamic'
    };
    var DefaultType = {
      offset: '(number|string|function)',
      flip: 'boolean',
      boundary: '(string|element)',
      reference: '(string|element)',
      display: 'string'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Dropdown =
    /*#__PURE__*/
    function () {
      function Dropdown(element, config) {
        this._element = element;
        this._popper = null;
        this._config = this._getConfig(config);
        this._menu = this._getMenuElement();
        this._inNavbar = this._detectNavbar();

        this._addEventListeners();
      } // Getters


      var _proto = Dropdown.prototype;

      // Public
      _proto.toggle = function toggle() {
        if (this._element.disabled || $$$1(this._element).hasClass(ClassName.DISABLED)) {
          return;
        }

        var parent = Dropdown._getParentFromElement(this._element);

        var isActive = $$$1(this._menu).hasClass(ClassName.SHOW);

        Dropdown._clearMenus();

        if (isActive) {
          return;
        }

        var relatedTarget = {
          relatedTarget: this._element
        };
        var showEvent = $$$1.Event(Event.SHOW, relatedTarget);
        $$$1(parent).trigger(showEvent);

        if (showEvent.isDefaultPrevented()) {
          return;
        } // Disable totally Popper.js for Dropdown in Navbar


        if (!this._inNavbar) {
          /**
           * Check for Popper dependency
           * Popper - https://popper.js.org
           */
          if (typeof Popper === 'undefined') {
            throw new TypeError('Bootstrap dropdown require Popper.js (https://popper.js.org)');
          }

          var referenceElement = this._element;

          if (this._config.reference === 'parent') {
            referenceElement = parent;
          } else if (Util.isElement(this._config.reference)) {
            referenceElement = this._config.reference; // Check if it's jQuery element

            if (typeof this._config.reference.jquery !== 'undefined') {
              referenceElement = this._config.reference[0];
            }
          } // If boundary is not `scrollParent`, then set position to `static`
          // to allow the menu to "escape" the scroll parent's boundaries
          // https://github.com/twbs/bootstrap/issues/24251


          if (this._config.boundary !== 'scrollParent') {
            $$$1(parent).addClass(ClassName.POSITION_STATIC);
          }

          this._popper = new Popper(referenceElement, this._menu, this._getPopperConfig());
        } // If this is a touch-enabled device we add extra
        // empty mouseover listeners to the body's immediate children;
        // only needed because of broken event delegation on iOS
        // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html


        if ('ontouchstart' in document.documentElement && $$$1(parent).closest(Selector.NAVBAR_NAV).length === 0) {
          $$$1(document.body).children().on('mouseover', null, $$$1.noop);
        }

        this._element.focus();

        this._element.setAttribute('aria-expanded', true);

        $$$1(this._menu).toggleClass(ClassName.SHOW);
        $$$1(parent).toggleClass(ClassName.SHOW).trigger($$$1.Event(Event.SHOWN, relatedTarget));
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        $$$1(this._element).off(EVENT_KEY);
        this._element = null;
        this._menu = null;

        if (this._popper !== null) {
          this._popper.destroy();

          this._popper = null;
        }
      };

      _proto.update = function update() {
        this._inNavbar = this._detectNavbar();

        if (this._popper !== null) {
          this._popper.scheduleUpdate();
        }
      }; // Private


      _proto._addEventListeners = function _addEventListeners() {
        var _this = this;

        $$$1(this._element).on(Event.CLICK, function (event) {
          event.preventDefault();
          event.stopPropagation();

          _this.toggle();
        });
      };

      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, this.constructor.Default, $$$1(this._element).data(), config);
        Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
        return config;
      };

      _proto._getMenuElement = function _getMenuElement() {
        if (!this._menu) {
          var parent = Dropdown._getParentFromElement(this._element);

          if (parent) {
            this._menu = parent.querySelector(Selector.MENU);
          }
        }

        return this._menu;
      };

      _proto._getPlacement = function _getPlacement() {
        var $parentDropdown = $$$1(this._element.parentNode);
        var placement = AttachmentMap.BOTTOM; // Handle dropup

        if ($parentDropdown.hasClass(ClassName.DROPUP)) {
          placement = AttachmentMap.TOP;

          if ($$$1(this._menu).hasClass(ClassName.MENURIGHT)) {
            placement = AttachmentMap.TOPEND;
          }
        } else if ($parentDropdown.hasClass(ClassName.DROPRIGHT)) {
          placement = AttachmentMap.RIGHT;
        } else if ($parentDropdown.hasClass(ClassName.DROPLEFT)) {
          placement = AttachmentMap.LEFT;
        } else if ($$$1(this._menu).hasClass(ClassName.MENURIGHT)) {
          placement = AttachmentMap.BOTTOMEND;
        }

        return placement;
      };

      _proto._detectNavbar = function _detectNavbar() {
        return $$$1(this._element).closest('.navbar').length > 0;
      };

      _proto._getPopperConfig = function _getPopperConfig() {
        var _this2 = this;

        var offsetConf = {};

        if (typeof this._config.offset === 'function') {
          offsetConf.fn = function (data) {
            data.offsets = _objectSpread({}, data.offsets, _this2._config.offset(data.offsets) || {});
            return data;
          };
        } else {
          offsetConf.offset = this._config.offset;
        }

        var popperConfig = {
          placement: this._getPlacement(),
          modifiers: {
            offset: offsetConf,
            flip: {
              enabled: this._config.flip
            },
            preventOverflow: {
              boundariesElement: this._config.boundary
            }
          } // Disable Popper.js if we have a static display

        };

        if (this._config.display === 'static') {
          popperConfig.modifiers.applyStyle = {
            enabled: false
          };
        }

        return popperConfig;
      }; // Static


      Dropdown._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' ? config : null;

          if (!data) {
            data = new Dropdown(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      Dropdown._clearMenus = function _clearMenus(event) {
        if (event && (event.which === RIGHT_MOUSE_BUTTON_WHICH || event.type === 'keyup' && event.which !== TAB_KEYCODE)) {
          return;
        }

        var toggles = [].slice.call(document.querySelectorAll(Selector.DATA_TOGGLE));

        for (var i = 0, len = toggles.length; i < len; i++) {
          var parent = Dropdown._getParentFromElement(toggles[i]);

          var context = $$$1(toggles[i]).data(DATA_KEY);
          var relatedTarget = {
            relatedTarget: toggles[i]
          };

          if (event && event.type === 'click') {
            relatedTarget.clickEvent = event;
          }

          if (!context) {
            continue;
          }

          var dropdownMenu = context._menu;

          if (!$$$1(parent).hasClass(ClassName.SHOW)) {
            continue;
          }

          if (event && (event.type === 'click' && /input|textarea/i.test(event.target.tagName) || event.type === 'keyup' && event.which === TAB_KEYCODE) && $$$1.contains(parent, event.target)) {
            continue;
          }

          var hideEvent = $$$1.Event(Event.HIDE, relatedTarget);
          $$$1(parent).trigger(hideEvent);

          if (hideEvent.isDefaultPrevented()) {
            continue;
          } // If this is a touch-enabled device we remove the extra
          // empty mouseover listeners we added for iOS support


          if ('ontouchstart' in document.documentElement) {
            $$$1(document.body).children().off('mouseover', null, $$$1.noop);
          }

          toggles[i].setAttribute('aria-expanded', 'false');
          $$$1(dropdownMenu).removeClass(ClassName.SHOW);
          $$$1(parent).removeClass(ClassName.SHOW).trigger($$$1.Event(Event.HIDDEN, relatedTarget));
        }
      };

      Dropdown._getParentFromElement = function _getParentFromElement(element) {
        var parent;
        var selector = Util.getSelectorFromElement(element);

        if (selector) {
          parent = document.querySelector(selector);
        }

        return parent || element.parentNode;
      }; // eslint-disable-next-line complexity


      Dropdown._dataApiKeydownHandler = function _dataApiKeydownHandler(event) {
        // If not input/textarea:
        //  - And not a key in REGEXP_KEYDOWN => not a dropdown command
        // If input/textarea:
        //  - If space key => not a dropdown command
        //  - If key is other than escape
        //    - If key is not up or down => not a dropdown command
        //    - If trigger inside the menu => not a dropdown command
        if (/input|textarea/i.test(event.target.tagName) ? event.which === SPACE_KEYCODE || event.which !== ESCAPE_KEYCODE && (event.which !== ARROW_DOWN_KEYCODE && event.which !== ARROW_UP_KEYCODE || $$$1(event.target).closest(Selector.MENU).length) : !REGEXP_KEYDOWN.test(event.which)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (this.disabled || $$$1(this).hasClass(ClassName.DISABLED)) {
          return;
        }

        var parent = Dropdown._getParentFromElement(this);

        var isActive = $$$1(parent).hasClass(ClassName.SHOW);

        if (!isActive && (event.which !== ESCAPE_KEYCODE || event.which !== SPACE_KEYCODE) || isActive && (event.which === ESCAPE_KEYCODE || event.which === SPACE_KEYCODE)) {
          if (event.which === ESCAPE_KEYCODE) {
            var toggle = parent.querySelector(Selector.DATA_TOGGLE);
            $$$1(toggle).trigger('focus');
          }

          $$$1(this).trigger('click');
          return;
        }

        var items = [].slice.call(parent.querySelectorAll(Selector.VISIBLE_ITEMS));

        if (items.length === 0) {
          return;
        }

        var index = items.indexOf(event.target);

        if (event.which === ARROW_UP_KEYCODE && index > 0) {
          // Up
          index--;
        }

        if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) {
          // Down
          index++;
        }

        if (index < 0) {
          index = 0;
        }

        items[index].focus();
      };

      _createClass(Dropdown, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }, {
        key: "DefaultType",
        get: function get() {
          return DefaultType;
        }
      }]);

      return Dropdown;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.KEYDOWN_DATA_API, Selector.DATA_TOGGLE, Dropdown._dataApiKeydownHandler).on(Event.KEYDOWN_DATA_API, Selector.MENU, Dropdown._dataApiKeydownHandler).on(Event.CLICK_DATA_API + " " + Event.KEYUP_DATA_API, Dropdown._clearMenus).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      event.preventDefault();
      event.stopPropagation();

      Dropdown._jQueryInterface.call($$$1(this), 'toggle');
    }).on(Event.CLICK_DATA_API, Selector.FORM_CHILD, function (e) {
      e.stopPropagation();
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Dropdown._jQueryInterface;
    $$$1.fn[NAME].Constructor = Dropdown;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Dropdown._jQueryInterface;
    };

    return Dropdown;
  }($, Popper);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): modal.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Modal = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'modal';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.modal';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

    var Default = {
      backdrop: true,
      keyboard: true,
      focus: true,
      show: true
    };
    var DefaultType = {
      backdrop: '(boolean|string)',
      keyboard: 'boolean',
      focus: 'boolean',
      show: 'boolean'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      RESIZE: "resize" + EVENT_KEY,
      CLICK_DISMISS: "click.dismiss" + EVENT_KEY,
      KEYDOWN_DISMISS: "keydown.dismiss" + EVENT_KEY,
      MOUSEUP_DISMISS: "mouseup.dismiss" + EVENT_KEY,
      MOUSEDOWN_DISMISS: "mousedown.dismiss" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      SCROLLBAR_MEASURER: 'modal-scrollbar-measure',
      BACKDROP: 'modal-backdrop',
      OPEN: 'modal-open',
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      DIALOG: '.modal-dialog',
      DATA_TOGGLE: '[data-toggle="modal"]',
      DATA_DISMISS: '[data-dismiss="modal"]',
      FIXED_CONTENT: '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top',
      STICKY_CONTENT: '.sticky-top'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Modal =
    /*#__PURE__*/
    function () {
      function Modal(element, config) {
        this._config = this._getConfig(config);
        this._element = element;
        this._dialog = element.querySelector(Selector.DIALOG);
        this._backdrop = null;
        this._isShown = false;
        this._isBodyOverflowing = false;
        this._ignoreBackdropClick = false;
        this._scrollbarWidth = 0;
      } // Getters


      var _proto = Modal.prototype;

      // Public
      _proto.toggle = function toggle(relatedTarget) {
        return this._isShown ? this.hide() : this.show(relatedTarget);
      };

      _proto.show = function show(relatedTarget) {
        var _this = this;

        if (this._isTransitioning || this._isShown) {
          return;
        }

        if ($$$1(this._element).hasClass(ClassName.FADE)) {
          this._isTransitioning = true;
        }

        var showEvent = $$$1.Event(Event.SHOW, {
          relatedTarget: relatedTarget
        });
        $$$1(this._element).trigger(showEvent);

        if (this._isShown || showEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = true;

        this._checkScrollbar();

        this._setScrollbar();

        this._adjustDialog();

        $$$1(document.body).addClass(ClassName.OPEN);

        this._setEscapeEvent();

        this._setResizeEvent();

        $$$1(this._element).on(Event.CLICK_DISMISS, Selector.DATA_DISMISS, function (event) {
          return _this.hide(event);
        });
        $$$1(this._dialog).on(Event.MOUSEDOWN_DISMISS, function () {
          $$$1(_this._element).one(Event.MOUSEUP_DISMISS, function (event) {
            if ($$$1(event.target).is(_this._element)) {
              _this._ignoreBackdropClick = true;
            }
          });
        });

        this._showBackdrop(function () {
          return _this._showElement(relatedTarget);
        });
      };

      _proto.hide = function hide(event) {
        var _this2 = this;

        if (event) {
          event.preventDefault();
        }

        if (this._isTransitioning || !this._isShown) {
          return;
        }

        var hideEvent = $$$1.Event(Event.HIDE);
        $$$1(this._element).trigger(hideEvent);

        if (!this._isShown || hideEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = false;
        var transition = $$$1(this._element).hasClass(ClassName.FADE);

        if (transition) {
          this._isTransitioning = true;
        }

        this._setEscapeEvent();

        this._setResizeEvent();

        $$$1(document).off(Event.FOCUSIN);
        $$$1(this._element).removeClass(ClassName.SHOW);
        $$$1(this._element).off(Event.CLICK_DISMISS);
        $$$1(this._dialog).off(Event.MOUSEDOWN_DISMISS);

        if (transition) {
          var transitionDuration = Util.getTransitionDurationFromElement(this._element);
          $$$1(this._element).one(Util.TRANSITION_END, function (event) {
            return _this2._hideModal(event);
          }).emulateTransitionEnd(transitionDuration);
        } else {
          this._hideModal();
        }
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        $$$1(window, document, this._element, this._backdrop).off(EVENT_KEY);
        this._config = null;
        this._element = null;
        this._dialog = null;
        this._backdrop = null;
        this._isShown = null;
        this._isBodyOverflowing = null;
        this._ignoreBackdropClick = null;
        this._scrollbarWidth = null;
      };

      _proto.handleUpdate = function handleUpdate() {
        this._adjustDialog();
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._showElement = function _showElement(relatedTarget) {
        var _this3 = this;

        var transition = $$$1(this._element).hasClass(ClassName.FADE);

        if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
          // Don't move modal's DOM position
          document.body.appendChild(this._element);
        }

        this._element.style.display = 'block';

        this._element.removeAttribute('aria-hidden');

        this._element.scrollTop = 0;

        if (transition) {
          Util.reflow(this._element);
        }

        $$$1(this._element).addClass(ClassName.SHOW);

        if (this._config.focus) {
          this._enforceFocus();
        }

        var shownEvent = $$$1.Event(Event.SHOWN, {
          relatedTarget: relatedTarget
        });

        var transitionComplete = function transitionComplete() {
          if (_this3._config.focus) {
            _this3._element.focus();
          }

          _this3._isTransitioning = false;
          $$$1(_this3._element).trigger(shownEvent);
        };

        if (transition) {
          var transitionDuration = Util.getTransitionDurationFromElement(this._element);
          $$$1(this._dialog).one(Util.TRANSITION_END, transitionComplete).emulateTransitionEnd(transitionDuration);
        } else {
          transitionComplete();
        }
      };

      _proto._enforceFocus = function _enforceFocus() {
        var _this4 = this;

        $$$1(document).off(Event.FOCUSIN) // Guard against infinite focus loop
        .on(Event.FOCUSIN, function (event) {
          if (document !== event.target && _this4._element !== event.target && $$$1(_this4._element).has(event.target).length === 0) {
            _this4._element.focus();
          }
        });
      };

      _proto._setEscapeEvent = function _setEscapeEvent() {
        var _this5 = this;

        if (this._isShown && this._config.keyboard) {
          $$$1(this._element).on(Event.KEYDOWN_DISMISS, function (event) {
            if (event.which === ESCAPE_KEYCODE) {
              event.preventDefault();

              _this5.hide();
            }
          });
        } else if (!this._isShown) {
          $$$1(this._element).off(Event.KEYDOWN_DISMISS);
        }
      };

      _proto._setResizeEvent = function _setResizeEvent() {
        var _this6 = this;

        if (this._isShown) {
          $$$1(window).on(Event.RESIZE, function (event) {
            return _this6.handleUpdate(event);
          });
        } else {
          $$$1(window).off(Event.RESIZE);
        }
      };

      _proto._hideModal = function _hideModal() {
        var _this7 = this;

        this._element.style.display = 'none';

        this._element.setAttribute('aria-hidden', true);

        this._isTransitioning = false;

        this._showBackdrop(function () {
          $$$1(document.body).removeClass(ClassName.OPEN);

          _this7._resetAdjustments();

          _this7._resetScrollbar();

          $$$1(_this7._element).trigger(Event.HIDDEN);
        });
      };

      _proto._removeBackdrop = function _removeBackdrop() {
        if (this._backdrop) {
          $$$1(this._backdrop).remove();
          this._backdrop = null;
        }
      };

      _proto._showBackdrop = function _showBackdrop(callback) {
        var _this8 = this;

        var animate = $$$1(this._element).hasClass(ClassName.FADE) ? ClassName.FADE : '';

        if (this._isShown && this._config.backdrop) {
          this._backdrop = document.createElement('div');
          this._backdrop.className = ClassName.BACKDROP;

          if (animate) {
            this._backdrop.classList.add(animate);
          }

          $$$1(this._backdrop).appendTo(document.body);
          $$$1(this._element).on(Event.CLICK_DISMISS, function (event) {
            if (_this8._ignoreBackdropClick) {
              _this8._ignoreBackdropClick = false;
              return;
            }

            if (event.target !== event.currentTarget) {
              return;
            }

            if (_this8._config.backdrop === 'static') {
              _this8._element.focus();
            } else {
              _this8.hide();
            }
          });

          if (animate) {
            Util.reflow(this._backdrop);
          }

          $$$1(this._backdrop).addClass(ClassName.SHOW);

          if (!callback) {
            return;
          }

          if (!animate) {
            callback();
            return;
          }

          var backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);
          $$$1(this._backdrop).one(Util.TRANSITION_END, callback).emulateTransitionEnd(backdropTransitionDuration);
        } else if (!this._isShown && this._backdrop) {
          $$$1(this._backdrop).removeClass(ClassName.SHOW);

          var callbackRemove = function callbackRemove() {
            _this8._removeBackdrop();

            if (callback) {
              callback();
            }
          };

          if ($$$1(this._element).hasClass(ClassName.FADE)) {
            var _backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);

            $$$1(this._backdrop).one(Util.TRANSITION_END, callbackRemove).emulateTransitionEnd(_backdropTransitionDuration);
          } else {
            callbackRemove();
          }
        } else if (callback) {
          callback();
        }
      }; // ----------------------------------------------------------------------
      // the following methods are used to handle overflowing modals
      // todo (fat): these should probably be refactored out of modal.js
      // ----------------------------------------------------------------------


      _proto._adjustDialog = function _adjustDialog() {
        var isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

        if (!this._isBodyOverflowing && isModalOverflowing) {
          this._element.style.paddingLeft = this._scrollbarWidth + "px";
        }

        if (this._isBodyOverflowing && !isModalOverflowing) {
          this._element.style.paddingRight = this._scrollbarWidth + "px";
        }
      };

      _proto._resetAdjustments = function _resetAdjustments() {
        this._element.style.paddingLeft = '';
        this._element.style.paddingRight = '';
      };

      _proto._checkScrollbar = function _checkScrollbar() {
        var rect = document.body.getBoundingClientRect();
        this._isBodyOverflowing = rect.left + rect.right < window.innerWidth;
        this._scrollbarWidth = this._getScrollbarWidth();
      };

      _proto._setScrollbar = function _setScrollbar() {
        var _this9 = this;

        if (this._isBodyOverflowing) {
          // Note: DOMNode.style.paddingRight returns the actual value or '' if not set
          //   while $(DOMNode).css('padding-right') returns the calculated value or 0 if not set
          var fixedContent = [].slice.call(document.querySelectorAll(Selector.FIXED_CONTENT));
          var stickyContent = [].slice.call(document.querySelectorAll(Selector.STICKY_CONTENT)); // Adjust fixed content padding

          $$$1(fixedContent).each(function (index, element) {
            var actualPadding = element.style.paddingRight;
            var calculatedPadding = $$$1(element).css('padding-right');
            $$$1(element).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + _this9._scrollbarWidth + "px");
          }); // Adjust sticky content margin

          $$$1(stickyContent).each(function (index, element) {
            var actualMargin = element.style.marginRight;
            var calculatedMargin = $$$1(element).css('margin-right');
            $$$1(element).data('margin-right', actualMargin).css('margin-right', parseFloat(calculatedMargin) - _this9._scrollbarWidth + "px");
          }); // Adjust body padding

          var actualPadding = document.body.style.paddingRight;
          var calculatedPadding = $$$1(document.body).css('padding-right');
          $$$1(document.body).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + this._scrollbarWidth + "px");
        }
      };

      _proto._resetScrollbar = function _resetScrollbar() {
        // Restore fixed content padding
        var fixedContent = [].slice.call(document.querySelectorAll(Selector.FIXED_CONTENT));
        $$$1(fixedContent).each(function (index, element) {
          var padding = $$$1(element).data('padding-right');
          $$$1(element).removeData('padding-right');
          element.style.paddingRight = padding ? padding : '';
        }); // Restore sticky content

        var elements = [].slice.call(document.querySelectorAll("" + Selector.STICKY_CONTENT));
        $$$1(elements).each(function (index, element) {
          var margin = $$$1(element).data('margin-right');

          if (typeof margin !== 'undefined') {
            $$$1(element).css('margin-right', margin).removeData('margin-right');
          }
        }); // Restore body padding

        var padding = $$$1(document.body).data('padding-right');
        $$$1(document.body).removeData('padding-right');
        document.body.style.paddingRight = padding ? padding : '';
      };

      _proto._getScrollbarWidth = function _getScrollbarWidth() {
        // thx d.walsh
        var scrollDiv = document.createElement('div');
        scrollDiv.className = ClassName.SCROLLBAR_MEASURER;
        document.body.appendChild(scrollDiv);
        var scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
        return scrollbarWidth;
      }; // Static


      Modal._jQueryInterface = function _jQueryInterface(config, relatedTarget) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = _objectSpread({}, Default, $$$1(this).data(), typeof config === 'object' && config ? config : {});

          if (!data) {
            data = new Modal(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config](relatedTarget);
          } else if (_config.show) {
            data.show(relatedTarget);
          }
        });
      };

      _createClass(Modal, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return Modal;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      var _this10 = this;

      var target;
      var selector = Util.getSelectorFromElement(this);

      if (selector) {
        target = document.querySelector(selector);
      }

      var config = $$$1(target).data(DATA_KEY) ? 'toggle' : _objectSpread({}, $$$1(target).data(), $$$1(this).data());

      if (this.tagName === 'A' || this.tagName === 'AREA') {
        event.preventDefault();
      }

      var $target = $$$1(target).one(Event.SHOW, function (showEvent) {
        if (showEvent.isDefaultPrevented()) {
          // Only register focus restorer if modal will actually get shown
          return;
        }

        $target.one(Event.HIDDEN, function () {
          if ($$$1(_this10).is(':visible')) {
            _this10.focus();
          }
        });
      });

      Modal._jQueryInterface.call($$$1(target), config, this);
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Modal._jQueryInterface;
    $$$1.fn[NAME].Constructor = Modal;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Modal._jQueryInterface;
    };

    return Modal;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): tooltip.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Tooltip = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'tooltip';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.tooltip';
    var EVENT_KEY = "." + DATA_KEY;
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var CLASS_PREFIX = 'bs-tooltip';
    var BSCLS_PREFIX_REGEX = new RegExp("(^|\\s)" + CLASS_PREFIX + "\\S+", 'g');
    var DefaultType = {
      animation: 'boolean',
      template: 'string',
      title: '(string|element|function)',
      trigger: 'string',
      delay: '(number|object)',
      html: 'boolean',
      selector: '(string|boolean)',
      placement: '(string|function)',
      offset: '(number|string)',
      container: '(string|element|boolean)',
      fallbackPlacement: '(string|array)',
      boundary: '(string|element)'
    };
    var AttachmentMap = {
      AUTO: 'auto',
      TOP: 'top',
      RIGHT: 'right',
      BOTTOM: 'bottom',
      LEFT: 'left'
    };
    var Default = {
      animation: true,
      template: '<div class="tooltip" role="tooltip">' + '<div class="arrow"></div>' + '<div class="tooltip-inner"></div></div>',
      trigger: 'hover focus',
      title: '',
      delay: 0,
      html: false,
      selector: false,
      placement: 'top',
      offset: 0,
      container: false,
      fallbackPlacement: 'flip',
      boundary: 'scrollParent'
    };
    var HoverState = {
      SHOW: 'show',
      OUT: 'out'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      INSERTED: "inserted" + EVENT_KEY,
      CLICK: "click" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      FOCUSOUT: "focusout" + EVENT_KEY,
      MOUSEENTER: "mouseenter" + EVENT_KEY,
      MOUSELEAVE: "mouseleave" + EVENT_KEY
    };
    var ClassName = {
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      TOOLTIP: '.tooltip',
      TOOLTIP_INNER: '.tooltip-inner',
      ARROW: '.arrow'
    };
    var Trigger = {
      HOVER: 'hover',
      FOCUS: 'focus',
      CLICK: 'click',
      MANUAL: 'manual'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Tooltip =
    /*#__PURE__*/
    function () {
      function Tooltip(element, config) {
        /**
         * Check for Popper dependency
         * Popper - https://popper.js.org
         */
        if (typeof Popper === 'undefined') {
          throw new TypeError('Bootstrap tooltips require Popper.js (https://popper.js.org)');
        } // private


        this._isEnabled = true;
        this._timeout = 0;
        this._hoverState = '';
        this._activeTrigger = {};
        this._popper = null; // Protected

        this.element = element;
        this.config = this._getConfig(config);
        this.tip = null;

        this._setListeners();
      } // Getters


      var _proto = Tooltip.prototype;

      // Public
      _proto.enable = function enable() {
        this._isEnabled = true;
      };

      _proto.disable = function disable() {
        this._isEnabled = false;
      };

      _proto.toggleEnabled = function toggleEnabled() {
        this._isEnabled = !this._isEnabled;
      };

      _proto.toggle = function toggle(event) {
        if (!this._isEnabled) {
          return;
        }

        if (event) {
          var dataKey = this.constructor.DATA_KEY;
          var context = $$$1(event.currentTarget).data(dataKey);

          if (!context) {
            context = new this.constructor(event.currentTarget, this._getDelegateConfig());
            $$$1(event.currentTarget).data(dataKey, context);
          }

          context._activeTrigger.click = !context._activeTrigger.click;

          if (context._isWithActiveTrigger()) {
            context._enter(null, context);
          } else {
            context._leave(null, context);
          }
        } else {
          if ($$$1(this.getTipElement()).hasClass(ClassName.SHOW)) {
            this._leave(null, this);

            return;
          }

          this._enter(null, this);
        }
      };

      _proto.dispose = function dispose() {
        clearTimeout(this._timeout);
        $$$1.removeData(this.element, this.constructor.DATA_KEY);
        $$$1(this.element).off(this.constructor.EVENT_KEY);
        $$$1(this.element).closest('.modal').off('hide.bs.modal');

        if (this.tip) {
          $$$1(this.tip).remove();
        }

        this._isEnabled = null;
        this._timeout = null;
        this._hoverState = null;
        this._activeTrigger = null;

        if (this._popper !== null) {
          this._popper.destroy();
        }

        this._popper = null;
        this.element = null;
        this.config = null;
        this.tip = null;
      };

      _proto.show = function show() {
        var _this = this;

        if ($$$1(this.element).css('display') === 'none') {
          throw new Error('Please use show on visible elements');
        }

        var showEvent = $$$1.Event(this.constructor.Event.SHOW);

        if (this.isWithContent() && this._isEnabled) {
          $$$1(this.element).trigger(showEvent);
          var isInTheDom = $$$1.contains(this.element.ownerDocument.documentElement, this.element);

          if (showEvent.isDefaultPrevented() || !isInTheDom) {
            return;
          }

          var tip = this.getTipElement();
          var tipId = Util.getUID(this.constructor.NAME);
          tip.setAttribute('id', tipId);
          this.element.setAttribute('aria-describedby', tipId);
          this.setContent();

          if (this.config.animation) {
            $$$1(tip).addClass(ClassName.FADE);
          }

          var placement = typeof this.config.placement === 'function' ? this.config.placement.call(this, tip, this.element) : this.config.placement;

          var attachment = this._getAttachment(placement);

          this.addAttachmentClass(attachment);
          var container = this.config.container === false ? document.body : $$$1(document).find(this.config.container);
          $$$1(tip).data(this.constructor.DATA_KEY, this);

          if (!$$$1.contains(this.element.ownerDocument.documentElement, this.tip)) {
            $$$1(tip).appendTo(container);
          }

          $$$1(this.element).trigger(this.constructor.Event.INSERTED);
          this._popper = new Popper(this.element, tip, {
            placement: attachment,
            modifiers: {
              offset: {
                offset: this.config.offset
              },
              flip: {
                behavior: this.config.fallbackPlacement
              },
              arrow: {
                element: Selector.ARROW
              },
              preventOverflow: {
                boundariesElement: this.config.boundary
              }
            },
            onCreate: function onCreate(data) {
              if (data.originalPlacement !== data.placement) {
                _this._handlePopperPlacementChange(data);
              }
            },
            onUpdate: function onUpdate(data) {
              _this._handlePopperPlacementChange(data);
            }
          });
          $$$1(tip).addClass(ClassName.SHOW); // If this is a touch-enabled device we add extra
          // empty mouseover listeners to the body's immediate children;
          // only needed because of broken event delegation on iOS
          // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html

          if ('ontouchstart' in document.documentElement) {
            $$$1(document.body).children().on('mouseover', null, $$$1.noop);
          }

          var complete = function complete() {
            if (_this.config.animation) {
              _this._fixTransition();
            }

            var prevHoverState = _this._hoverState;
            _this._hoverState = null;
            $$$1(_this.element).trigger(_this.constructor.Event.SHOWN);

            if (prevHoverState === HoverState.OUT) {
              _this._leave(null, _this);
            }
          };

          if ($$$1(this.tip).hasClass(ClassName.FADE)) {
            var transitionDuration = Util.getTransitionDurationFromElement(this.tip);
            $$$1(this.tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
          } else {
            complete();
          }
        }
      };

      _proto.hide = function hide(callback) {
        var _this2 = this;

        var tip = this.getTipElement();
        var hideEvent = $$$1.Event(this.constructor.Event.HIDE);

        var complete = function complete() {
          if (_this2._hoverState !== HoverState.SHOW && tip.parentNode) {
            tip.parentNode.removeChild(tip);
          }

          _this2._cleanTipClass();

          _this2.element.removeAttribute('aria-describedby');

          $$$1(_this2.element).trigger(_this2.constructor.Event.HIDDEN);

          if (_this2._popper !== null) {
            _this2._popper.destroy();
          }

          if (callback) {
            callback();
          }
        };

        $$$1(this.element).trigger(hideEvent);

        if (hideEvent.isDefaultPrevented()) {
          return;
        }

        $$$1(tip).removeClass(ClassName.SHOW); // If this is a touch-enabled device we remove the extra
        // empty mouseover listeners we added for iOS support

        if ('ontouchstart' in document.documentElement) {
          $$$1(document.body).children().off('mouseover', null, $$$1.noop);
        }

        this._activeTrigger[Trigger.CLICK] = false;
        this._activeTrigger[Trigger.FOCUS] = false;
        this._activeTrigger[Trigger.HOVER] = false;

        if ($$$1(this.tip).hasClass(ClassName.FADE)) {
          var transitionDuration = Util.getTransitionDurationFromElement(tip);
          $$$1(tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        } else {
          complete();
        }

        this._hoverState = '';
      };

      _proto.update = function update() {
        if (this._popper !== null) {
          this._popper.scheduleUpdate();
        }
      }; // Protected


      _proto.isWithContent = function isWithContent() {
        return Boolean(this.getTitle());
      };

      _proto.addAttachmentClass = function addAttachmentClass(attachment) {
        $$$1(this.getTipElement()).addClass(CLASS_PREFIX + "-" + attachment);
      };

      _proto.getTipElement = function getTipElement() {
        this.tip = this.tip || $$$1(this.config.template)[0];
        return this.tip;
      };

      _proto.setContent = function setContent() {
        var tip = this.getTipElement();
        this.setElementContent($$$1(tip.querySelectorAll(Selector.TOOLTIP_INNER)), this.getTitle());
        $$$1(tip).removeClass(ClassName.FADE + " " + ClassName.SHOW);
      };

      _proto.setElementContent = function setElementContent($element, content) {
        var html = this.config.html;

        if (typeof content === 'object' && (content.nodeType || content.jquery)) {
          // Content is a DOM node or a jQuery
          if (html) {
            if (!$$$1(content).parent().is($element)) {
              $element.empty().append(content);
            }
          } else {
            $element.text($$$1(content).text());
          }
        } else {
          $element[html ? 'html' : 'text'](content);
        }
      };

      _proto.getTitle = function getTitle() {
        var title = this.element.getAttribute('data-original-title');

        if (!title) {
          title = typeof this.config.title === 'function' ? this.config.title.call(this.element) : this.config.title;
        }

        return title;
      }; // Private


      _proto._getAttachment = function _getAttachment(placement) {
        return AttachmentMap[placement.toUpperCase()];
      };

      _proto._setListeners = function _setListeners() {
        var _this3 = this;

        var triggers = this.config.trigger.split(' ');
        triggers.forEach(function (trigger) {
          if (trigger === 'click') {
            $$$1(_this3.element).on(_this3.constructor.Event.CLICK, _this3.config.selector, function (event) {
              return _this3.toggle(event);
            });
          } else if (trigger !== Trigger.MANUAL) {
            var eventIn = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSEENTER : _this3.constructor.Event.FOCUSIN;
            var eventOut = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSELEAVE : _this3.constructor.Event.FOCUSOUT;
            $$$1(_this3.element).on(eventIn, _this3.config.selector, function (event) {
              return _this3._enter(event);
            }).on(eventOut, _this3.config.selector, function (event) {
              return _this3._leave(event);
            });
          }

          $$$1(_this3.element).closest('.modal').on('hide.bs.modal', function () {
            return _this3.hide();
          });
        });

        if (this.config.selector) {
          this.config = _objectSpread({}, this.config, {
            trigger: 'manual',
            selector: ''
          });
        } else {
          this._fixTitle();
        }
      };

      _proto._fixTitle = function _fixTitle() {
        var titleType = typeof this.element.getAttribute('data-original-title');

        if (this.element.getAttribute('title') || titleType !== 'string') {
          this.element.setAttribute('data-original-title', this.element.getAttribute('title') || '');
          this.element.setAttribute('title', '');
        }
      };

      _proto._enter = function _enter(event, context) {
        var dataKey = this.constructor.DATA_KEY;
        context = context || $$$1(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $$$1(event.currentTarget).data(dataKey, context);
        }

        if (event) {
          context._activeTrigger[event.type === 'focusin' ? Trigger.FOCUS : Trigger.HOVER] = true;
        }

        if ($$$1(context.getTipElement()).hasClass(ClassName.SHOW) || context._hoverState === HoverState.SHOW) {
          context._hoverState = HoverState.SHOW;
          return;
        }

        clearTimeout(context._timeout);
        context._hoverState = HoverState.SHOW;

        if (!context.config.delay || !context.config.delay.show) {
          context.show();
          return;
        }

        context._timeout = setTimeout(function () {
          if (context._hoverState === HoverState.SHOW) {
            context.show();
          }
        }, context.config.delay.show);
      };

      _proto._leave = function _leave(event, context) {
        var dataKey = this.constructor.DATA_KEY;
        context = context || $$$1(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $$$1(event.currentTarget).data(dataKey, context);
        }

        if (event) {
          context._activeTrigger[event.type === 'focusout' ? Trigger.FOCUS : Trigger.HOVER] = false;
        }

        if (context._isWithActiveTrigger()) {
          return;
        }

        clearTimeout(context._timeout);
        context._hoverState = HoverState.OUT;

        if (!context.config.delay || !context.config.delay.hide) {
          context.hide();
          return;
        }

        context._timeout = setTimeout(function () {
          if (context._hoverState === HoverState.OUT) {
            context.hide();
          }
        }, context.config.delay.hide);
      };

      _proto._isWithActiveTrigger = function _isWithActiveTrigger() {
        for (var trigger in this._activeTrigger) {
          if (this._activeTrigger[trigger]) {
            return true;
          }
        }

        return false;
      };

      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, this.constructor.Default, $$$1(this.element).data(), typeof config === 'object' && config ? config : {});

        if (typeof config.delay === 'number') {
          config.delay = {
            show: config.delay,
            hide: config.delay
          };
        }

        if (typeof config.title === 'number') {
          config.title = config.title.toString();
        }

        if (typeof config.content === 'number') {
          config.content = config.content.toString();
        }

        Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);
        return config;
      };

      _proto._getDelegateConfig = function _getDelegateConfig() {
        var config = {};

        if (this.config) {
          for (var key in this.config) {
            if (this.constructor.Default[key] !== this.config[key]) {
              config[key] = this.config[key];
            }
          }
        }

        return config;
      };

      _proto._cleanTipClass = function _cleanTipClass() {
        var $tip = $$$1(this.getTipElement());
        var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);

        if (tabClass !== null && tabClass.length) {
          $tip.removeClass(tabClass.join(''));
        }
      };

      _proto._handlePopperPlacementChange = function _handlePopperPlacementChange(popperData) {
        var popperInstance = popperData.instance;
        this.tip = popperInstance.popper;

        this._cleanTipClass();

        this.addAttachmentClass(this._getAttachment(popperData.placement));
      };

      _proto._fixTransition = function _fixTransition() {
        var tip = this.getTipElement();
        var initConfigAnimation = this.config.animation;

        if (tip.getAttribute('x-placement') !== null) {
          return;
        }

        $$$1(tip).removeClass(ClassName.FADE);
        this.config.animation = false;
        this.hide();
        this.show();
        this.config.animation = initConfigAnimation;
      }; // Static


      Tooltip._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' && config;

          if (!data && /dispose|hide/.test(config)) {
            return;
          }

          if (!data) {
            data = new Tooltip(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Tooltip, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }, {
        key: "NAME",
        get: function get() {
          return NAME;
        }
      }, {
        key: "DATA_KEY",
        get: function get() {
          return DATA_KEY;
        }
      }, {
        key: "Event",
        get: function get() {
          return Event;
        }
      }, {
        key: "EVENT_KEY",
        get: function get() {
          return EVENT_KEY;
        }
      }, {
        key: "DefaultType",
        get: function get() {
          return DefaultType;
        }
      }]);

      return Tooltip;
    }();
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */


    $$$1.fn[NAME] = Tooltip._jQueryInterface;
    $$$1.fn[NAME].Constructor = Tooltip;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Tooltip._jQueryInterface;
    };

    return Tooltip;
  }($, Popper);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): popover.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Popover = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'popover';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.popover';
    var EVENT_KEY = "." + DATA_KEY;
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var CLASS_PREFIX = 'bs-popover';
    var BSCLS_PREFIX_REGEX = new RegExp("(^|\\s)" + CLASS_PREFIX + "\\S+", 'g');

    var Default = _objectSpread({}, Tooltip.Default, {
      placement: 'right',
      trigger: 'click',
      content: '',
      template: '<div class="popover" role="tooltip">' + '<div class="arrow"></div>' + '<h3 class="popover-header"></h3>' + '<div class="popover-body"></div></div>'
    });

    var DefaultType = _objectSpread({}, Tooltip.DefaultType, {
      content: '(string|element|function)'
    });

    var ClassName = {
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      TITLE: '.popover-header',
      CONTENT: '.popover-body'
    };
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      INSERTED: "inserted" + EVENT_KEY,
      CLICK: "click" + EVENT_KEY,
      FOCUSIN: "focusin" + EVENT_KEY,
      FOCUSOUT: "focusout" + EVENT_KEY,
      MOUSEENTER: "mouseenter" + EVENT_KEY,
      MOUSELEAVE: "mouseleave" + EVENT_KEY
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Popover =
    /*#__PURE__*/
    function (_Tooltip) {
      _inheritsLoose(Popover, _Tooltip);

      function Popover() {
        return _Tooltip.apply(this, arguments) || this;
      }

      var _proto = Popover.prototype;

      // Overrides
      _proto.isWithContent = function isWithContent() {
        return this.getTitle() || this._getContent();
      };

      _proto.addAttachmentClass = function addAttachmentClass(attachment) {
        $$$1(this.getTipElement()).addClass(CLASS_PREFIX + "-" + attachment);
      };

      _proto.getTipElement = function getTipElement() {
        this.tip = this.tip || $$$1(this.config.template)[0];
        return this.tip;
      };

      _proto.setContent = function setContent() {
        var $tip = $$$1(this.getTipElement()); // We use append for html objects to maintain js events

        this.setElementContent($tip.find(Selector.TITLE), this.getTitle());

        var content = this._getContent();

        if (typeof content === 'function') {
          content = content.call(this.element);
        }

        this.setElementContent($tip.find(Selector.CONTENT), content);
        $tip.removeClass(ClassName.FADE + " " + ClassName.SHOW);
      }; // Private


      _proto._getContent = function _getContent() {
        return this.element.getAttribute('data-content') || this.config.content;
      };

      _proto._cleanTipClass = function _cleanTipClass() {
        var $tip = $$$1(this.getTipElement());
        var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);

        if (tabClass !== null && tabClass.length > 0) {
          $tip.removeClass(tabClass.join(''));
        }
      }; // Static


      Popover._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' ? config : null;

          if (!data && /destroy|hide/.test(config)) {
            return;
          }

          if (!data) {
            data = new Popover(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Popover, null, [{
        key: "VERSION",
        // Getters
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }, {
        key: "NAME",
        get: function get() {
          return NAME;
        }
      }, {
        key: "DATA_KEY",
        get: function get() {
          return DATA_KEY;
        }
      }, {
        key: "Event",
        get: function get() {
          return Event;
        }
      }, {
        key: "EVENT_KEY",
        get: function get() {
          return EVENT_KEY;
        }
      }, {
        key: "DefaultType",
        get: function get() {
          return DefaultType;
        }
      }]);

      return Popover;
    }(Tooltip);
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */


    $$$1.fn[NAME] = Popover._jQueryInterface;
    $$$1.fn[NAME].Constructor = Popover;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Popover._jQueryInterface;
    };

    return Popover;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): scrollspy.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var ScrollSpy = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'scrollspy';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.scrollspy';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Default = {
      offset: 10,
      method: 'auto',
      target: ''
    };
    var DefaultType = {
      offset: 'number',
      method: 'string',
      target: '(string|element)'
    };
    var Event = {
      ACTIVATE: "activate" + EVENT_KEY,
      SCROLL: "scroll" + EVENT_KEY,
      LOAD_DATA_API: "load" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      DROPDOWN_ITEM: 'dropdown-item',
      DROPDOWN_MENU: 'dropdown-menu',
      ACTIVE: 'active'
    };
    var Selector = {
      DATA_SPY: '[data-spy="scroll"]',
      ACTIVE: '.active',
      NAV_LIST_GROUP: '.nav, .list-group',
      NAV_LINKS: '.nav-link',
      NAV_ITEMS: '.nav-item',
      LIST_ITEMS: '.list-group-item',
      DROPDOWN: '.dropdown',
      DROPDOWN_ITEMS: '.dropdown-item',
      DROPDOWN_TOGGLE: '.dropdown-toggle'
    };
    var OffsetMethod = {
      OFFSET: 'offset',
      POSITION: 'position'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var ScrollSpy =
    /*#__PURE__*/
    function () {
      function ScrollSpy(element, config) {
        var _this = this;

        this._element = element;
        this._scrollElement = element.tagName === 'BODY' ? window : element;
        this._config = this._getConfig(config);
        this._selector = this._config.target + " " + Selector.NAV_LINKS + "," + (this._config.target + " " + Selector.LIST_ITEMS + ",") + (this._config.target + " " + Selector.DROPDOWN_ITEMS);
        this._offsets = [];
        this._targets = [];
        this._activeTarget = null;
        this._scrollHeight = 0;
        $$$1(this._scrollElement).on(Event.SCROLL, function (event) {
          return _this._process(event);
        });
        this.refresh();

        this._process();
      } // Getters


      var _proto = ScrollSpy.prototype;

      // Public
      _proto.refresh = function refresh() {
        var _this2 = this;

        var autoMethod = this._scrollElement === this._scrollElement.window ? OffsetMethod.OFFSET : OffsetMethod.POSITION;
        var offsetMethod = this._config.method === 'auto' ? autoMethod : this._config.method;
        var offsetBase = offsetMethod === OffsetMethod.POSITION ? this._getScrollTop() : 0;
        this._offsets = [];
        this._targets = [];
        this._scrollHeight = this._getScrollHeight();
        var targets = [].slice.call(document.querySelectorAll(this._selector));
        targets.map(function (element) {
          var target;
          var targetSelector = Util.getSelectorFromElement(element);

          if (targetSelector) {
            target = document.querySelector(targetSelector);
          }

          if (target) {
            var targetBCR = target.getBoundingClientRect();

            if (targetBCR.width || targetBCR.height) {
              // TODO (fat): remove sketch reliance on jQuery position/offset
              return [$$$1(target)[offsetMethod]().top + offsetBase, targetSelector];
            }
          }

          return null;
        }).filter(function (item) {
          return item;
        }).sort(function (a, b) {
          return a[0] - b[0];
        }).forEach(function (item) {
          _this2._offsets.push(item[0]);

          _this2._targets.push(item[1]);
        });
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        $$$1(this._scrollElement).off(EVENT_KEY);
        this._element = null;
        this._scrollElement = null;
        this._config = null;
        this._selector = null;
        this._offsets = null;
        this._targets = null;
        this._activeTarget = null;
        this._scrollHeight = null;
      }; // Private


      _proto._getConfig = function _getConfig(config) {
        config = _objectSpread({}, Default, typeof config === 'object' && config ? config : {});

        if (typeof config.target !== 'string') {
          var id = $$$1(config.target).attr('id');

          if (!id) {
            id = Util.getUID(NAME);
            $$$1(config.target).attr('id', id);
          }

          config.target = "#" + id;
        }

        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      _proto._getScrollTop = function _getScrollTop() {
        return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
      };

      _proto._getScrollHeight = function _getScrollHeight() {
        return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      };

      _proto._getOffsetHeight = function _getOffsetHeight() {
        return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height;
      };

      _proto._process = function _process() {
        var scrollTop = this._getScrollTop() + this._config.offset;

        var scrollHeight = this._getScrollHeight();

        var maxScroll = this._config.offset + scrollHeight - this._getOffsetHeight();

        if (this._scrollHeight !== scrollHeight) {
          this.refresh();
        }

        if (scrollTop >= maxScroll) {
          var target = this._targets[this._targets.length - 1];

          if (this._activeTarget !== target) {
            this._activate(target);
          }

          return;
        }

        if (this._activeTarget && scrollTop < this._offsets[0] && this._offsets[0] > 0) {
          this._activeTarget = null;

          this._clear();

          return;
        }

        var offsetLength = this._offsets.length;

        for (var i = offsetLength; i--;) {
          var isActiveTarget = this._activeTarget !== this._targets[i] && scrollTop >= this._offsets[i] && (typeof this._offsets[i + 1] === 'undefined' || scrollTop < this._offsets[i + 1]);

          if (isActiveTarget) {
            this._activate(this._targets[i]);
          }
        }
      };

      _proto._activate = function _activate(target) {
        this._activeTarget = target;

        this._clear();

        var queries = this._selector.split(','); // eslint-disable-next-line arrow-body-style


        queries = queries.map(function (selector) {
          return selector + "[data-target=\"" + target + "\"]," + (selector + "[href=\"" + target + "\"]");
        });
        var $link = $$$1([].slice.call(document.querySelectorAll(queries.join(','))));

        if ($link.hasClass(ClassName.DROPDOWN_ITEM)) {
          $link.closest(Selector.DROPDOWN).find(Selector.DROPDOWN_TOGGLE).addClass(ClassName.ACTIVE);
          $link.addClass(ClassName.ACTIVE);
        } else {
          // Set triggered link as active
          $link.addClass(ClassName.ACTIVE); // Set triggered links parents as active
          // With both <ul> and <nav> markup a parent is the previous sibling of any nav ancestor

          $link.parents(Selector.NAV_LIST_GROUP).prev(Selector.NAV_LINKS + ", " + Selector.LIST_ITEMS).addClass(ClassName.ACTIVE); // Handle special case when .nav-link is inside .nav-item

          $link.parents(Selector.NAV_LIST_GROUP).prev(Selector.NAV_ITEMS).children(Selector.NAV_LINKS).addClass(ClassName.ACTIVE);
        }

        $$$1(this._scrollElement).trigger(Event.ACTIVATE, {
          relatedTarget: target
        });
      };

      _proto._clear = function _clear() {
        var nodes = [].slice.call(document.querySelectorAll(this._selector));
        $$$1(nodes).filter(Selector.ACTIVE).removeClass(ClassName.ACTIVE);
      }; // Static


      ScrollSpy._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $$$1(this).data(DATA_KEY);

          var _config = typeof config === 'object' && config;

          if (!data) {
            data = new ScrollSpy(this, _config);
            $$$1(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(ScrollSpy, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }, {
        key: "Default",
        get: function get() {
          return Default;
        }
      }]);

      return ScrollSpy;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(window).on(Event.LOAD_DATA_API, function () {
      var scrollSpys = [].slice.call(document.querySelectorAll(Selector.DATA_SPY));
      var scrollSpysLength = scrollSpys.length;

      for (var i = scrollSpysLength; i--;) {
        var $spy = $$$1(scrollSpys[i]);

        ScrollSpy._jQueryInterface.call($spy, $spy.data());
      }
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = ScrollSpy._jQueryInterface;
    $$$1.fn[NAME].Constructor = ScrollSpy;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return ScrollSpy._jQueryInterface;
    };

    return ScrollSpy;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): tab.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Tab = function ($$$1) {
    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    var NAME = 'tab';
    var VERSION = '4.1.3';
    var DATA_KEY = 'bs.tab';
    var EVENT_KEY = "." + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $$$1.fn[NAME];
    var Event = {
      HIDE: "hide" + EVENT_KEY,
      HIDDEN: "hidden" + EVENT_KEY,
      SHOW: "show" + EVENT_KEY,
      SHOWN: "shown" + EVENT_KEY,
      CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
    };
    var ClassName = {
      DROPDOWN_MENU: 'dropdown-menu',
      ACTIVE: 'active',
      DISABLED: 'disabled',
      FADE: 'fade',
      SHOW: 'show'
    };
    var Selector = {
      DROPDOWN: '.dropdown',
      NAV_LIST_GROUP: '.nav, .list-group',
      ACTIVE: '.active',
      ACTIVE_UL: '> li > .active',
      DATA_TOGGLE: '[data-toggle="tab"], [data-toggle="pill"], [data-toggle="list"]',
      DROPDOWN_TOGGLE: '.dropdown-toggle',
      DROPDOWN_ACTIVE_CHILD: '> .dropdown-menu .active'
      /**
       * ------------------------------------------------------------------------
       * Class Definition
       * ------------------------------------------------------------------------
       */

    };

    var Tab =
    /*#__PURE__*/
    function () {
      function Tab(element) {
        this._element = element;
      } // Getters


      var _proto = Tab.prototype;

      // Public
      _proto.show = function show() {
        var _this = this;

        if (this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && $$$1(this._element).hasClass(ClassName.ACTIVE) || $$$1(this._element).hasClass(ClassName.DISABLED)) {
          return;
        }

        var target;
        var previous;
        var listElement = $$$1(this._element).closest(Selector.NAV_LIST_GROUP)[0];
        var selector = Util.getSelectorFromElement(this._element);

        if (listElement) {
          var itemSelector = listElement.nodeName === 'UL' ? Selector.ACTIVE_UL : Selector.ACTIVE;
          previous = $$$1.makeArray($$$1(listElement).find(itemSelector));
          previous = previous[previous.length - 1];
        }

        var hideEvent = $$$1.Event(Event.HIDE, {
          relatedTarget: this._element
        });
        var showEvent = $$$1.Event(Event.SHOW, {
          relatedTarget: previous
        });

        if (previous) {
          $$$1(previous).trigger(hideEvent);
        }

        $$$1(this._element).trigger(showEvent);

        if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) {
          return;
        }

        if (selector) {
          target = document.querySelector(selector);
        }

        this._activate(this._element, listElement);

        var complete = function complete() {
          var hiddenEvent = $$$1.Event(Event.HIDDEN, {
            relatedTarget: _this._element
          });
          var shownEvent = $$$1.Event(Event.SHOWN, {
            relatedTarget: previous
          });
          $$$1(previous).trigger(hiddenEvent);
          $$$1(_this._element).trigger(shownEvent);
        };

        if (target) {
          this._activate(target, target.parentNode, complete);
        } else {
          complete();
        }
      };

      _proto.dispose = function dispose() {
        $$$1.removeData(this._element, DATA_KEY);
        this._element = null;
      }; // Private


      _proto._activate = function _activate(element, container, callback) {
        var _this2 = this;

        var activeElements;

        if (container.nodeName === 'UL') {
          activeElements = $$$1(container).find(Selector.ACTIVE_UL);
        } else {
          activeElements = $$$1(container).children(Selector.ACTIVE);
        }

        var active = activeElements[0];
        var isTransitioning = callback && active && $$$1(active).hasClass(ClassName.FADE);

        var complete = function complete() {
          return _this2._transitionComplete(element, active, callback);
        };

        if (active && isTransitioning) {
          var transitionDuration = Util.getTransitionDurationFromElement(active);
          $$$1(active).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        } else {
          complete();
        }
      };

      _proto._transitionComplete = function _transitionComplete(element, active, callback) {
        if (active) {
          $$$1(active).removeClass(ClassName.SHOW + " " + ClassName.ACTIVE);
          var dropdownChild = $$$1(active.parentNode).find(Selector.DROPDOWN_ACTIVE_CHILD)[0];

          if (dropdownChild) {
            $$$1(dropdownChild).removeClass(ClassName.ACTIVE);
          }

          if (active.getAttribute('role') === 'tab') {
            active.setAttribute('aria-selected', false);
          }
        }

        $$$1(element).addClass(ClassName.ACTIVE);

        if (element.getAttribute('role') === 'tab') {
          element.setAttribute('aria-selected', true);
        }

        Util.reflow(element);
        $$$1(element).addClass(ClassName.SHOW);

        if (element.parentNode && $$$1(element.parentNode).hasClass(ClassName.DROPDOWN_MENU)) {
          var dropdownElement = $$$1(element).closest(Selector.DROPDOWN)[0];

          if (dropdownElement) {
            var dropdownToggleList = [].slice.call(dropdownElement.querySelectorAll(Selector.DROPDOWN_TOGGLE));
            $$$1(dropdownToggleList).addClass(ClassName.ACTIVE);
          }

          element.setAttribute('aria-expanded', true);
        }

        if (callback) {
          callback();
        }
      }; // Static


      Tab._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $this = $$$1(this);
          var data = $this.data(DATA_KEY);

          if (!data) {
            data = new Tab(this);
            $this.data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (typeof data[config] === 'undefined') {
              throw new TypeError("No method named \"" + config + "\"");
            }

            data[config]();
          }
        });
      };

      _createClass(Tab, null, [{
        key: "VERSION",
        get: function get() {
          return VERSION;
        }
      }]);

      return Tab;
    }();
    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */


    $$$1(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      event.preventDefault();

      Tab._jQueryInterface.call($$$1(this), 'show');
    });
    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $$$1.fn[NAME] = Tab._jQueryInterface;
    $$$1.fn[NAME].Constructor = Tab;

    $$$1.fn[NAME].noConflict = function () {
      $$$1.fn[NAME] = JQUERY_NO_CONFLICT;
      return Tab._jQueryInterface;
    };

    return Tab;
  }($);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.1.3): index.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  (function ($$$1) {
    if (typeof $$$1 === 'undefined') {
      throw new TypeError('Bootstrap\'s JavaScript requires jQuery. jQuery must be included before Bootstrap\'s JavaScript.');
    }

    var version = $$$1.fn.jquery.split(' ')[0].split('.');
    var minMajor = 1;
    var ltMajor = 2;
    var minMinor = 9;
    var minPatch = 1;
    var maxMajor = 4;

    if (version[0] < ltMajor && version[1] < minMinor || version[0] === minMajor && version[1] === minMinor && version[2] < minPatch || version[0] >= maxMajor) {
      throw new Error('Bootstrap\'s JavaScript requires at least jQuery v1.9.1 but less than v4.0.0');
    }
  })($);

  exports.Util = Util;
  exports.Alert = Alert;
  exports.Button = Button;
  exports.Carousel = Carousel;
  exports.Collapse = Collapse;
  exports.Dropdown = Dropdown;
  exports.Modal = Modal;
  exports.Popover = Popover;
  exports.Scrollspy = ScrollSpy;
  exports.Tab = Tab;
  exports.Tooltip = Tooltip;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bootstrap.js.map

var cookie = function (key, value, options) {

	// key and at least value given, set cookie...
	if (arguments.length > 1 && String(value) !== "[object Object]") {
		options = jQuery.extend({}, options);

		if (value === null || value === undefined) {
			options.expires = -1;
		}

		if (typeof options.expires === 'number') {
			var days = options.expires, t = options.expires = new Date();
			t.setDate(t.getDate() + days);
		}

		value = String(value);

		return (document.cookie = [
			encodeURIComponent(key), '=',
			options.raw ? value : encodeURIComponent(value),
			options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
			'; path=/',
			options.secure ? '; secure' : ''
		].join(''));
	}

	// key and possibly options given, get cookie...
	options = value || {};
	var result, decode = options.raw ? function (s) { return s; } : decodeURIComponent;
	return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null;
};

// ==================================================
// fancyBox v3.5.2
//
// Licensed GPLv3 for open source use
// or fancyBox Commercial License for commercial use
//
// http://fancyapps.com/fancybox/
// Copyright 2018 fancyApps
//
// ==================================================
(function(window, document, $, undefined) {
	"use strict";

	window.console = window.console || {
		info: function(stuff) {}
	};

	// If there's no jQuery, fancyBox can't work
	// =========================================

	if (!$) {
		return;
	}

	// Check if fancyBox is already initialized
	// ========================================

	if ($.fn.fancybox) {
		console.info("fancyBox already initialized");

		return;
	}

	// Private default settings
	// ========================

	var defaults = {
		// Close existing modals
		// Set this to false if you do not need to stack multiple instances
		closeExisting: false,

		// Enable infinite gallery navigation
		loop: false,

		// Horizontal space between slides
		gutter: 50,

		// Enable keyboard navigation
		keyboard: true,

		// Should allow caption to overlap the content
		preventCaptionOverlap: true,

		// Should display navigation arrows at the screen edges
		arrows: true,

		// Should display counter at the top left corner
		infobar: true,

		// Should display close button (using `btnTpl.smallBtn` template) over the content
		// Can be true, false, "auto"
		// If "auto" - will be automatically enabled for "html", "inline" or "ajax" items
		smallBtn: "auto",

		// Should display toolbar (buttons at the top)
		// Can be true, false, "auto"
		// If "auto" - will be automatically hidden if "smallBtn" is enabled
		toolbar: "auto",

		// What buttons should appear in the top right corner.
		// Buttons will be created using templates from `btnTpl` option
		// and they will be placed into toolbar (class="fancybox-toolbar"` element)
		buttons: [
			"zoom",
			//"share",
			"slideShow",
			//"fullScreen",
			//"download",
			"thumbs",
			"close"
		],

		// Detect "idle" time in seconds
		idleTime: 3,

		// Disable right-click and use simple image protection for images
		protect: false,

		// Shortcut to make content "modal" - disable keyboard navigtion, hide buttons, etc
		modal: false,

		image: {
			// Wait for images to load before displaying
			//   true  - wait for image to load and then display;
			//   false - display thumbnail and load the full-sized image over top,
			//           requires predefined image dimensions (`data-width` and `data-height` attributes)
			preload: false
		},

		ajax: {
			// Object containing settings for ajax request
			settings: {
				// This helps to indicate that request comes from the modal
				// Feel free to change naming
				data: {
					fancybox: true
				}
			}
		},

		iframe: {
			// Iframe template
			tpl:
				'<iframe id="fancybox-frame{rnd}" name="fancybox-frame{rnd}" class="fancybox-iframe" allowfullscreen allow="autoplay; fullscreen" src=""></iframe>',

			// Preload iframe before displaying it
			// This allows to calculate iframe content width and height
			// (note: Due to "Same Origin Policy", you can't get cross domain data).
			preload: true,

			// Custom CSS styling for iframe wrapping element
			// You can use this to set custom iframe dimensions
			css: {},

			// Iframe tag attributes
			attr: {
				scrolling: "auto"
			}
		},

		// For HTML5 video only
		video: {
			tpl:
				'<video class="fancybox-video" controls controlsList="nodownload" poster="{{poster}}">' +
				'<source src="{{src}}" type="{{format}}" />' +
				'Sorry, your browser doesn\'t support embedded videos, <a href="{{src}}">download</a> and watch with your favorite video player!' +
				"</video>",
			format: "", // custom video format
			autoStart: true
		},

		// Default content type if cannot be detected automatically
		defaultType: "image",

		// Open/close animation type
		// Possible values:
		//   false            - disable
		//   "zoom"           - zoom images from/to thumbnail
		//   "fade"
		//   "zoom-in-out"
		//
		animationEffect: "zoom",

		// Duration in ms for open/close animation
		animationDuration: 366,

		// Should image change opacity while zooming
		// If opacity is "auto", then opacity will be changed if image and thumbnail have different aspect ratios
		zoomOpacity: "auto",

		// Transition effect between slides
		//
		// Possible values:
		//   false            - disable
		//   "fade'
		//   "slide'
		//   "circular'
		//   "tube'
		//   "zoom-in-out'
		//   "rotate'
		//
		transitionEffect: "fade",

		// Duration in ms for transition animation
		transitionDuration: 366,

		// Custom CSS class for slide element
		slideClass: "",

		// Custom CSS class for layout
		baseClass: "",

		// Base template for layout
		baseTpl:
			'<div class="fancybox-container" role="dialog" tabindex="-1">' +
			'<div class="fancybox-bg"></div>' +
			'<div class="fancybox-inner">' +
			'<div class="fancybox-infobar"><span data-fancybox-index></span>&nbsp;/&nbsp;<span data-fancybox-count></span></div>' +
			'<div class="fancybox-toolbar">{{buttons}}</div>' +
			'<div class="fancybox-navigation">{{arrows}}</div>' +
			'<div class="fancybox-stage"></div>' +
			'<div class="fancybox-caption"></div>' +
			"</div>" +
			"</div>",

		// Loading indicator template
		spinnerTpl: '<div class="fancybox-loading"></div>',

		// Error message template
		errorTpl: '<div class="fancybox-error"><p>{{ERROR}}</p></div>',

		btnTpl: {
			download:
				'<a download data-fancybox-download class="fancybox-button fancybox-button--download" title="{{DOWNLOAD}}" href="javascript:;">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.62 17.09V19H5.38v-1.91zm-2.97-6.96L17 11.45l-5 4.87-5-4.87 1.36-1.32 2.68 2.64V5h1.92v7.77z"/></svg>' +
				"</a>",

			zoom:
				'<button data-fancybox-zoom class="fancybox-button fancybox-button--zoom" title="{{ZOOM}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.7 17.3l-3-3a5.9 5.9 0 0 0-.6-7.6 5.9 5.9 0 0 0-8.4 0 5.9 5.9 0 0 0 0 8.4 5.9 5.9 0 0 0 7.7.7l3 3a1 1 0 0 0 1.3 0c.4-.5.4-1 0-1.5zM8.1 13.8a4 4 0 0 1 0-5.7 4 4 0 0 1 5.7 0 4 4 0 0 1 0 5.7 4 4 0 0 1-5.7 0z"/></svg>' +
				"</button>",

			close:
				'<button data-fancybox-close class="fancybox-button fancybox-button--close" title="{{CLOSE}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 10.6L6.6 5.2 5.2 6.6l5.4 5.4-5.4 5.4 1.4 1.4 5.4-5.4 5.4 5.4 1.4-1.4-5.4-5.4 5.4-5.4-1.4-1.4-5.4 5.4z"/></svg>' +
				"</button>",

			// Arrows
			arrowLeft:
				'<button data-fancybox-prev class="fancybox-button fancybox-button--arrow_left" title="{{PREV}}">' +
				'<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.28 15.7l-1.34 1.37L5 12l4.94-5.07 1.34 1.38-2.68 2.72H19v1.94H8.6z"/></svg></div>' +
				"</button>",

			arrowRight:
				'<button data-fancybox-next class="fancybox-button fancybox-button--arrow_right" title="{{NEXT}}">' +
				'<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.4 12.97l-2.68 2.72 1.34 1.38L19 12l-4.94-5.07-1.34 1.38 2.68 2.72H5v1.94z"/></svg></div>' +
				"</button>",

			// This small close button will be appended to your html/inline/ajax content by default,
			// if "smallBtn" option is not set to false
			smallBtn:
				'<button type="button" data-fancybox-close class="fancybox-button fancybox-close-small" title="{{CLOSE}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" version="1" viewBox="0 0 24 24"><path d="M13 12l5-5-1-1-5 5-5-5-1 1 5 5-5 5 1 1 5-5 5 5 1-1z"/></svg>' +
				"</button>"
		},

		// Container is injected into this element
		parentEl: "body",

		// Hide browser vertical scrollbars; use at your own risk
		hideScrollbar: true,

		// Focus handling
		// ==============

		// Try to focus on the first focusable element after opening
		autoFocus: true,

		// Put focus back to active element after closing
		backFocus: true,

		// Do not let user to focus on element outside modal content
		trapFocus: true,

		// Module specific options
		// =======================

		fullScreen: {
			autoStart: false
		},

		// Set `touch: false` to disable panning/swiping
		touch: {
			vertical: true, // Allow to drag content vertically
			momentum: true // Continue movement after releasing mouse/touch when panning
		},

		// Hash value when initializing manually,
		// set `false` to disable hash change
		hash: null,

		// Customize or add new media types
		// Example:
		/*
      media : {
        youtube : {
          params : {
            autoplay : 0
          }
        }
      }
    */
		media: {},

		slideShow: {
			autoStart: false,
			speed: 3000
		},

		thumbs: {
			autoStart: false, // Display thumbnails on opening
			hideOnClose: true, // Hide thumbnail grid when closing animation starts
			parentEl: ".fancybox-container", // Container is injected into this element
			axis: "y" // Vertical (y) or horizontal (x) scrolling
		},

		// Use mousewheel to navigate gallery
		// If 'auto' - enabled for images only
		wheel: "auto",

		// Callbacks
		//==========

		// See Documentation/API/Events for more information
		// Example:
		/*
      afterShow: function( instance, current ) {
        console.info( 'Clicked element:' );
        console.info( current.opts.$orig );
      }
    */

		onInit: $.noop, // When instance has been initialized

		beforeLoad: $.noop, // Before the content of a slide is being loaded
		afterLoad: $.noop, // When the content of a slide is done loading

		beforeShow: $.noop, // Before open animation starts
		afterShow: $.noop, // When content is done loading and animating

		beforeClose: $.noop, // Before the instance attempts to close. Return false to cancel the close.
		afterClose: $.noop, // After instance has been closed

		onActivate: $.noop, // When instance is brought to front
		onDeactivate: $.noop, // When other instance has been activated

		// Interaction
		// ===========

		// Use options below to customize taken action when user clicks or double clicks on the fancyBox area,
		// each option can be string or method that returns value.
		//
		// Possible values:
		//   "close"           - close instance
		//   "next"            - move to next gallery item
		//   "nextOrClose"     - move to next gallery item or close if gallery has only one item
		//   "toggleControls"  - show/hide controls
		//   "zoom"            - zoom image (if loaded)
		//   false             - do nothing

		// Clicked on the content
		clickContent: function(current, event) {
			return current.type === "image" ? "zoom" : false;
		},

		// Clicked on the slide
		clickSlide: "close",

		// Clicked on the background (backdrop) element;
		// if you have not changed the layout, then most likely you need to use `clickSlide` option
		clickOutside: "close",

		// Same as previous two, but for double click
		dblclickContent: false,
		dblclickSlide: false,
		dblclickOutside: false,

		// Custom options when mobile device is detected
		// =============================================

		mobile: {
			preventCaptionOverlap: false,
			idleTime: false,
			clickContent: function(current, event) {
				return current.type === "image" ? "toggleControls" : false;
			},
			clickSlide: function(current, event) {
				return current.type === "image" ? "toggleControls" : "close";
			},
			dblclickContent: function(current, event) {
				return current.type === "image" ? "zoom" : false;
			},
			dblclickSlide: function(current, event) {
				return current.type === "image" ? "zoom" : false;
			}
		},

		// Internationalization
		// ====================

		lang: "en",
		i18n: {
			en: {
				CLOSE: "Close",
				NEXT: "Next",
				PREV: "Previous",
				ERROR: "The requested content cannot be loaded. <br/> Please try again later.",
				PLAY_START: "Start slideshow",
				PLAY_STOP: "Pause slideshow",
				FULL_SCREEN: "Full screen",
				THUMBS: "Thumbnails",
				DOWNLOAD: "Download",
				SHARE: "Share",
				ZOOM: "Zoom"
			},
			de: {
				CLOSE: "Schliessen",
				NEXT: "Weiter",
				PREV: "Zurück",
				ERROR: "Die angeforderten Daten konnten nicht geladen werden. <br/> Bitte versuchen Sie es später nochmal.",
				PLAY_START: "Diaschau starten",
				PLAY_STOP: "Diaschau beenden",
				FULL_SCREEN: "Vollbild",
				THUMBS: "Vorschaubilder",
				DOWNLOAD: "Herunterladen",
				SHARE: "Teilen",
				ZOOM: "Maßstab"
			}
		}
	};

	// Few useful variables and methods
	// ================================

	var $W = $(window);
	var $D = $(document);

	var called = 0;

	// Check if an object is a jQuery object and not a native JavaScript object
	// ========================================================================
	var isQuery = function(obj) {
		return obj && obj.hasOwnProperty && obj instanceof $;
	};

	// Handle multiple browsers for "requestAnimationFrame" and "cancelAnimationFrame"
	// ===============================================================================
	var requestAFrame = (function() {
		return (
			window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			// if all else fails, use setTimeout
			function(callback) {
				return window.setTimeout(callback, 1000 / 60);
			}
		);
	})();

	var cancelAFrame = (function() {
		return (
			window.cancelAnimationFrame ||
			window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			window.oCancelAnimationFrame ||
			function(id) {
				window.clearTimeout(id);
			}
		);
	})();

	// Detect the supported transition-end event property name
	// =======================================================
	var transitionEnd = (function() {
		var el = document.createElement("fakeelement"),
			t;

		var transitions = {
			transition: "transitionend",
			OTransition: "oTransitionEnd",
			MozTransition: "transitionend",
			WebkitTransition: "webkitTransitionEnd"
		};

		for (t in transitions) {
			if (el.style[t] !== undefined) {
				return transitions[t];
			}
		}

		return "transitionend";
	})();

	// Force redraw on an element.
	// This helps in cases where the browser doesn't redraw an updated element properly
	// ================================================================================
	var forceRedraw = function($el) {
		return $el && $el.length && $el[0].offsetHeight;
	};

	// Exclude array (`buttons`) options from deep merging
	// ===================================================
	var mergeOpts = function(opts1, opts2) {
		var rez = $.extend(true, {}, opts1, opts2);

		$.each(opts2, function(key, value) {
			if ($.isArray(value)) {
				rez[key] = value;
			}
		});

		return rez;
	};

	// How much of an element is visible in viewport
	// =============================================

	var inViewport = function(elem) {
		var elemCenter, rez;

		if (!elem || elem.ownerDocument !== document) {
			return false;
		}

		$(".fancybox-container").css("pointer-events", "none");

		elemCenter = {
			x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
			y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
		};

		rez = document.elementFromPoint(elemCenter.x, elemCenter.y) === elem;

		$(".fancybox-container").css("pointer-events", "");

		return rez;
	};

	// Class definition
	// ================

	var FancyBox = function(content, opts, index) {
		var self = this;

		self.opts = mergeOpts({index: index}, $.fancybox.defaults);

		if ($.isPlainObject(opts)) {
			self.opts = mergeOpts(self.opts, opts);
		}

		if ($.fancybox.isMobile) {
			self.opts = mergeOpts(self.opts, self.opts.mobile);
		}

		self.id = self.opts.id || ++called;

		self.currIndex = parseInt(self.opts.index, 10) || 0;
		self.prevIndex = null;

		self.prevPos = null;
		self.currPos = 0;

		self.firstRun = true;

		// All group items
		self.group = [];

		// Existing slides (for current, next and previous gallery items)
		self.slides = {};

		// Create group elements
		self.addContent(content);

		if (!self.group.length) {
			return;
		}

		self.init();
	};

	$.extend(FancyBox.prototype, {
		// Create DOM structure
		// ====================

		init: function() {
			var self = this,
				firstItem = self.group[self.currIndex],
				firstItemOpts = firstItem.opts,
				$container,
				buttonStr;

			if (firstItemOpts.closeExisting) {
				$.fancybox.close(true);
			}

			// Hide scrollbars
			// ===============

			$("body").addClass("fancybox-active");

			if (
				!$.fancybox.getInstance() &&
				firstItemOpts.hideScrollbar !== false &&
				!$.fancybox.isMobile &&
				document.body.scrollHeight > window.innerHeight
			) {
				$("head").append(
					'<style id="fancybox-style-noscroll" type="text/css">.compensate-for-scrollbar{margin-right:' +
					(window.innerWidth - document.documentElement.clientWidth) +
					"px;}</style>"
				);

				$("body").addClass("compensate-for-scrollbar");
			}

			// Build html markup and set references
			// ====================================

			// Build html code for buttons and insert into main template
			buttonStr = "";

			$.each(firstItemOpts.buttons, function(index, value) {
				buttonStr += firstItemOpts.btnTpl[value] || "";
			});

			// Create markup from base template, it will be initially hidden to
			// avoid unnecessary work like painting while initializing is not complete
			$container = $(
				self.translate(
					self,
					firstItemOpts.baseTpl
						.replace("{{buttons}}", buttonStr)
						.replace("{{arrows}}", firstItemOpts.btnTpl.arrowLeft + firstItemOpts.btnTpl.arrowRight)
				)
			)
				.attr("id", "fancybox-container-" + self.id)
				.addClass(firstItemOpts.baseClass)
				.data("FancyBox", self)
				.appendTo(firstItemOpts.parentEl);

			// Create object holding references to jQuery wrapped nodes
			self.$refs = {
				container: $container
			};

			["bg", "inner", "infobar", "toolbar", "stage", "caption", "navigation"].forEach(function(item) {
				self.$refs[item] = $container.find(".fancybox-" + item);
			});

			self.trigger("onInit");

			// Enable events, deactive previous instances
			self.activate();

			// Build slides, load and reveal content
			self.jumpTo(self.currIndex);
		},

		// Simple i18n support - replaces object keys found in template
		// with corresponding values
		// ============================================================

		translate: function(obj, str) {
			var arr = obj.opts.i18n[obj.opts.lang] || obj.opts.i18n.en;

			return str.replace(/\{\{(\w+)\}\}/g, function(match, n) {
				var value = arr[n];

				if (value === undefined) {
					return match;
				}

				return value;
			});
		},

		// Populate current group with fresh content
		// Check if each object has valid type and content
		// ===============================================

		addContent: function(content) {
			var self = this,
				items = $.makeArray(content),
				thumbs;

			$.each(items, function(i, item) {
				var obj = {},
					opts = {},
					$item,
					type,
					found,
					src,
					srcParts;

				// Step 1 - Make sure we have an object
				// ====================================

				if ($.isPlainObject(item)) {
					// We probably have manual usage here, something like
					// $.fancybox.open( [ { src : "image.jpg", type : "image" } ] )

					obj = item;
					opts = item.opts || item;
				} else if ($.type(item) === "object" && $(item).length) {
					// Here we probably have jQuery collection returned by some selector
					$item = $(item);

					// Support attributes like `data-options='{"touch" : false}'` and `data-touch='false'`
					opts = $item.data() || {};
					opts = $.extend(true, {}, opts, opts.options);

					// Here we store clicked element
					opts.$orig = $item;

					obj.src = self.opts.src || opts.src || $item.attr("href");

					// Assume that simple syntax is used, for example:
					//   `$.fancybox.open( $("#test"), {} );`
					if (!obj.type && !obj.src) {
						obj.type = "inline";
						obj.src = item;
					}
				} else {
					// Assume we have a simple html code, for example:
					//   $.fancybox.open( '<div><h1>Hi!</h1></div>' );
					obj = {
						type: "html",
						src: item + ""
					};
				}

				// Each gallery object has full collection of options
				obj.opts = $.extend(true, {}, self.opts, opts);

				// Do not merge buttons array
				if ($.isArray(opts.buttons)) {
					obj.opts.buttons = opts.buttons;
				}

				if ($.fancybox.isMobile && obj.opts.mobile) {
					obj.opts = mergeOpts(obj.opts, obj.opts.mobile);
				}

				// Step 2 - Make sure we have content type, if not - try to guess
				// ==============================================================

				type = obj.type || obj.opts.type;
				src = obj.src || "";

				if (!type && src) {
					if ((found = src.match(/\.(mp4|mov|ogv|webm)((\?|#).*)?$/i))) {
						type = "video";

						if (!obj.opts.video.format) {
							obj.opts.video.format = "video/" + (found[1] === "ogv" ? "ogg" : found[1]);
						}
					} else if (src.match(/(^data:image\/[a-z0-9+\/=]*,)|(\.(jp(e|g|eg)|gif|png|bmp|webp|svg|ico)((\?|#).*)?$)/i)) {
						type = "image";
					} else if (src.match(/\.(pdf)((\?|#).*)?$/i)) {
						type = "iframe";
						obj = $.extend(true, obj, {contentType: "pdf", opts: {iframe: {preload: false}}});
					} else if (src.charAt(0) === "#") {
						type = "inline";
					}
				}

				if (type) {
					obj.type = type;
				} else {
					self.trigger("objectNeedsType", obj);
				}

				if (!obj.contentType) {
					obj.contentType = $.inArray(obj.type, ["html", "inline", "ajax"]) > -1 ? "html" : obj.type;
				}

				// Step 3 - Some adjustments
				// =========================

				obj.index = self.group.length;

				if (obj.opts.smallBtn == "auto") {
					obj.opts.smallBtn = $.inArray(obj.type, ["html", "inline", "ajax"]) > -1;
				}

				if (obj.opts.toolbar === "auto") {
					obj.opts.toolbar = !obj.opts.smallBtn;
				}

				// Find thumbnail image, check if exists and if is in the viewport
				obj.$thumb = obj.opts.$thumb || null;

				if (obj.opts.$trigger && obj.index === self.opts.index) {
					obj.$thumb = obj.opts.$trigger.find("img:first");

					if (obj.$thumb.length) {
						obj.opts.$orig = obj.opts.$trigger;
					}
				}

				if (!(obj.$thumb && obj.$thumb.length) && obj.opts.$orig) {
					obj.$thumb = obj.opts.$orig.find("img:first");
				}

				if (obj.$thumb && !obj.$thumb.length) {
					obj.$thumb = null;
				}

				obj.thumb = obj.opts.thumb || (obj.$thumb ? obj.$thumb[0].src : null);

				// "caption" is a "special" option, it can be used to customize caption per gallery item
				if ($.type(obj.opts.caption) === "function") {
					obj.opts.caption = obj.opts.caption.apply(item, [self, obj]);
				}

				if ($.type(self.opts.caption) === "function") {
					obj.opts.caption = self.opts.caption.apply(item, [self, obj]);
				}

				// Make sure we have caption as a string or jQuery object
				if (!(obj.opts.caption instanceof $)) {
					obj.opts.caption = obj.opts.caption === undefined ? "" : obj.opts.caption + "";
				}

				// Check if url contains "filter" used to filter the content
				// Example: "ajax.html #something"
				if (obj.type === "ajax") {
					srcParts = src.split(/\s+/, 2);

					if (srcParts.length > 1) {
						obj.src = srcParts.shift();

						obj.opts.filter = srcParts.shift();
					}
				}

				// Hide all buttons and disable interactivity for modal items
				if (obj.opts.modal) {
					obj.opts = $.extend(true, obj.opts, {
						trapFocus: true,
						// Remove buttons
						infobar: 0,
						toolbar: 0,

						smallBtn: 0,

						// Disable keyboard navigation
						keyboard: 0,

						// Disable some modules
						slideShow: 0,
						fullScreen: 0,
						thumbs: 0,
						touch: 0,

						// Disable click event handlers
						clickContent: false,
						clickSlide: false,
						clickOutside: false,
						dblclickContent: false,
						dblclickSlide: false,
						dblclickOutside: false
					});
				}

				// Step 4 - Add processed object to group
				// ======================================

				self.group.push(obj);
			});

			// Update controls if gallery is already opened
			if (Object.keys(self.slides).length) {
				self.updateControls();

				// Update thumbnails, if needed
				thumbs = self.Thumbs;

				if (thumbs && thumbs.isActive) {
					thumbs.create();

					thumbs.focus();
				}
			}
		},

		// Attach an event handler functions for:
		//   - navigation buttons
		//   - browser scrolling, resizing;
		//   - focusing
		//   - keyboard
		//   - detecting inactivity
		// ======================================

		addEvents: function() {
			var self = this;

			self.removeEvents();

			// Make navigation elements clickable
			// ==================================

			self.$refs.container
				.on("click.fb-close", "[data-fancybox-close]", function(e) {
					e.stopPropagation();
					e.preventDefault();

					self.close(e);
				})
				.on("touchstart.fb-prev click.fb-prev", "[data-fancybox-prev]", function(e) {
					e.stopPropagation();
					e.preventDefault();

					self.previous();
				})
				.on("touchstart.fb-next click.fb-next", "[data-fancybox-next]", function(e) {
					e.stopPropagation();
					e.preventDefault();

					self.next();
				})
				.on("click.fb", "[data-fancybox-zoom]", function(e) {
					// Click handler for zoom button
					self[self.isScaledDown() ? "scaleToActual" : "scaleToFit"]();
				});

			// Handle page scrolling and browser resizing
			// ==========================================

			$W.on("orientationchange.fb resize.fb", function(e) {
				if (e && e.originalEvent && e.originalEvent.type === "resize") {
					if (self.requestId) {
						cancelAFrame(self.requestId);
					}

					self.requestId = requestAFrame(function() {
						self.update(e);
					});
				} else {
					if (self.current && self.current.type === "iframe") {
						self.$refs.stage.hide();
					}

					setTimeout(function() {
						self.$refs.stage.show();

						self.update(e);
					}, $.fancybox.isMobile ? 600 : 250);
				}
			});

			$D.on("keydown.fb", function(e) {
				var instance = $.fancybox ? $.fancybox.getInstance() : null,
					current = instance.current,
					keycode = e.keyCode || e.which;

				// Trap keyboard focus inside of the modal
				// =======================================

				if (keycode == 9) {
					if (current.opts.trapFocus) {
						self.focus(e);
					}

					return;
				}

				// Enable keyboard navigation
				// ==========================

				if (!current.opts.keyboard || e.ctrlKey || e.altKey || e.shiftKey || $(e.target).is("input") || $(e.target).is("textarea")) {
					return;
				}

				// Backspace and Esc keys
				if (keycode === 8 || keycode === 27) {
					e.preventDefault();

					self.close(e);

					return;
				}

				// Left arrow and Up arrow
				if (keycode === 37 || keycode === 38) {
					e.preventDefault();

					self.previous();

					return;
				}

				// Righ arrow and Down arrow
				if (keycode === 39 || keycode === 40) {
					e.preventDefault();

					self.next();

					return;
				}

				self.trigger("afterKeydown", e, keycode);
			});

			// Hide controls after some inactivity period
			if (self.group[self.currIndex].opts.idleTime) {
				self.idleSecondsCounter = 0;

				$D.on(
					"mousemove.fb-idle mouseleave.fb-idle mousedown.fb-idle touchstart.fb-idle touchmove.fb-idle scroll.fb-idle keydown.fb-idle",
					function(e) {
						self.idleSecondsCounter = 0;

						if (self.isIdle) {
							self.showControls();
						}

						self.isIdle = false;
					}
				);

				self.idleInterval = window.setInterval(function() {
					self.idleSecondsCounter++;

					if (self.idleSecondsCounter >= self.group[self.currIndex].opts.idleTime && !self.isDragging) {
						self.isIdle = true;
						self.idleSecondsCounter = 0;

						self.hideControls();
					}
				}, 1000);
			}
		},

		// Remove events added by the core
		// ===============================

		removeEvents: function() {
			var self = this;

			$W.off("orientationchange.fb resize.fb");
			$D.off("keydown.fb .fb-idle");

			this.$refs.container.off(".fb-close .fb-prev .fb-next");

			if (self.idleInterval) {
				window.clearInterval(self.idleInterval);

				self.idleInterval = null;
			}
		},

		// Change to previous gallery item
		// ===============================

		previous: function(duration) {
			return this.jumpTo(this.currPos - 1, duration);
		},

		// Change to next gallery item
		// ===========================

		next: function(duration) {
			return this.jumpTo(this.currPos + 1, duration);
		},

		// Switch to selected gallery item
		// ===============================

		jumpTo: function(pos, duration) {
			var self = this,
				groupLen = self.group.length,
				firstRun,
				isMoved,
				loop,
				current,
				previous,
				slidePos,
				stagePos,
				prop,
				diff;

			if (self.isDragging || self.isClosing || (self.isAnimating && self.firstRun)) {
				return;
			}

			// Should loop?
			pos = parseInt(pos, 10);
			loop = self.current ? self.current.opts.loop : self.opts.loop;

			if (!loop && (pos < 0 || pos >= groupLen)) {
				return false;
			}

			// Check if opening for the first time; this helps to speed things up
			firstRun = self.firstRun = !Object.keys(self.slides).length;

			// Create slides
			previous = self.current;

			self.prevIndex = self.currIndex;
			self.prevPos = self.currPos;

			current = self.createSlide(pos);

			if (groupLen > 1) {
				if (loop || current.index < groupLen - 1) {
					self.createSlide(pos + 1);
				}

				if (loop || current.index > 0) {
					self.createSlide(pos - 1);
				}
			}

			self.current = current;
			self.currIndex = current.index;
			self.currPos = current.pos;

			self.trigger("beforeShow", firstRun);

			self.updateControls();

			// Validate duration length
			current.forcedDuration = undefined;

			if ($.isNumeric(duration)) {
				current.forcedDuration = duration;
			} else {
				duration = current.opts[firstRun ? "animationDuration" : "transitionDuration"];
			}

			duration = parseInt(duration, 10);

			// Check if user has swiped the slides or if still animating
			isMoved = self.isMoved(current);

			// Make sure current slide is visible
			current.$slide.addClass("fancybox-slide--current");

			// Fresh start - reveal container, current slide and start loading content
			if (firstRun) {
				if (current.opts.animationEffect && duration) {
					self.$refs.container.css("transition-duration", duration + "ms");
				}

				self.$refs.container.addClass("fancybox-is-open").trigger("focus");

				// Attempt to load content into slide
				// This will later call `afterLoad` -> `revealContent`
				self.loadSlide(current);

				self.preload("image");

				return;
			}

			// Get actual slide/stage positions (before cleaning up)
			slidePos = $.fancybox.getTranslate(previous.$slide);
			stagePos = $.fancybox.getTranslate(self.$refs.stage);

			// Clean up all slides
			$.each(self.slides, function(index, slide) {
				$.fancybox.stop(slide.$slide, true);
			});

			if (previous.pos !== current.pos) {
				previous.isComplete = false;
			}

			previous.$slide.removeClass("fancybox-slide--complete fancybox-slide--current");

			// If slides are out of place, then animate them to correct position
			if (isMoved) {
				// Calculate horizontal swipe distance
				diff = slidePos.left - (previous.pos * slidePos.width + previous.pos * previous.opts.gutter);

				$.each(self.slides, function(index, slide) {
					slide.$slide.removeClass("fancybox-animated").removeClass(function(index, className) {
						return (className.match(/(^|\s)fancybox-fx-\S+/g) || []).join(" ");
					});

					// Make sure that each slide is in equal distance
					// This is mostly needed for freshly added slides, because they are not yet positioned
					var leftPos = slide.pos * slidePos.width + slide.pos * slide.opts.gutter;

					$.fancybox.setTranslate(slide.$slide, {top: 0, left: leftPos - stagePos.left + diff});

					if (slide.pos !== current.pos) {
						slide.$slide.addClass("fancybox-slide--" + (slide.pos > current.pos ? "next" : "previous"));
					}

					// Redraw to make sure that transition will start
					forceRedraw(slide.$slide);

					// Animate the slide
					$.fancybox.animate(
						slide.$slide,
						{
							top: 0,
							left: (slide.pos - current.pos) * slidePos.width + (slide.pos - current.pos) * slide.opts.gutter
						},
						duration,
						function() {
							slide.$slide
								.css({
									transform: "",
									opacity: ""
								})
								.removeClass("fancybox-slide--next fancybox-slide--previous");

							if (slide.pos === self.currPos) {
								self.complete();
							}
						}
					);
				});
			} else if (duration && current.opts.transitionEffect) {
				// Set transition effect for previously active slide
				prop = "fancybox-animated fancybox-fx-" + current.opts.transitionEffect;

				previous.$slide.addClass("fancybox-slide--" + (previous.pos > current.pos ? "next" : "previous"));

				$.fancybox.animate(
					previous.$slide,
					prop,
					duration,
					function() {
						previous.$slide.removeClass(prop).removeClass("fancybox-slide--next fancybox-slide--previous");
					},
					false
				);
			}

			if (current.isLoaded) {
				self.revealContent(current);
			} else {
				self.loadSlide(current);
			}

			self.preload("image");
		},

		// Create new "slide" element
		// These are gallery items  that are actually added to DOM
		// =======================================================

		createSlide: function(pos) {
			var self = this,
				$slide,
				index;

			index = pos % self.group.length;
			index = index < 0 ? self.group.length + index : index;

			if (!self.slides[pos] && self.group[index]) {
				$slide = $('<div class="fancybox-slide"></div>').appendTo(self.$refs.stage);

				self.slides[pos] = $.extend(true, {}, self.group[index], {
					pos: pos,
					$slide: $slide,
					isLoaded: false
				});

				self.updateSlide(self.slides[pos]);
			}

			return self.slides[pos];
		},

		// Scale image to the actual size of the image;
		// x and y values should be relative to the slide
		// ==============================================

		scaleToActual: function(x, y, duration) {
			var self = this,
				current = self.current,
				$content = current.$content,
				canvasWidth = $.fancybox.getTranslate(current.$slide).width,
				canvasHeight = $.fancybox.getTranslate(current.$slide).height,
				newImgWidth = current.width,
				newImgHeight = current.height,
				imgPos,
				posX,
				posY,
				scaleX,
				scaleY;

			if (self.isAnimating || self.isMoved() || !$content || !(current.type == "image" && current.isLoaded && !current.hasError)) {
				return;
			}

			self.isAnimating = true;

			$.fancybox.stop($content);

			x = x === undefined ? canvasWidth * 0.5 : x;
			y = y === undefined ? canvasHeight * 0.5 : y;

			imgPos = $.fancybox.getTranslate($content);

			imgPos.top -= $.fancybox.getTranslate(current.$slide).top;
			imgPos.left -= $.fancybox.getTranslate(current.$slide).left;

			scaleX = newImgWidth / imgPos.width;
			scaleY = newImgHeight / imgPos.height;

			// Get center position for original image
			posX = canvasWidth * 0.5 - newImgWidth * 0.5;
			posY = canvasHeight * 0.5 - newImgHeight * 0.5;

			// Make sure image does not move away from edges
			if (newImgWidth > canvasWidth) {
				posX = imgPos.left * scaleX - (x * scaleX - x);

				if (posX > 0) {
					posX = 0;
				}

				if (posX < canvasWidth - newImgWidth) {
					posX = canvasWidth - newImgWidth;
				}
			}

			if (newImgHeight > canvasHeight) {
				posY = imgPos.top * scaleY - (y * scaleY - y);

				if (posY > 0) {
					posY = 0;
				}

				if (posY < canvasHeight - newImgHeight) {
					posY = canvasHeight - newImgHeight;
				}
			}

			self.updateCursor(newImgWidth, newImgHeight);

			$.fancybox.animate(
				$content,
				{
					top: posY,
					left: posX,
					scaleX: scaleX,
					scaleY: scaleY
				},
				duration || 330,
				function() {
					self.isAnimating = false;
				}
			);

			// Stop slideshow
			if (self.SlideShow && self.SlideShow.isActive) {
				self.SlideShow.stop();
			}
		},

		// Scale image to fit inside parent element
		// ========================================

		scaleToFit: function(duration) {
			var self = this,
				current = self.current,
				$content = current.$content,
				end;

			if (self.isAnimating || self.isMoved() || !$content || !(current.type == "image" && current.isLoaded && !current.hasError)) {
				return;
			}

			self.isAnimating = true;

			$.fancybox.stop($content);

			end = self.getFitPos(current);

			self.updateCursor(end.width, end.height);

			$.fancybox.animate(
				$content,
				{
					top: end.top,
					left: end.left,
					scaleX: end.width / $content.width(),
					scaleY: end.height / $content.height()
				},
				duration || 330,
				function() {
					self.isAnimating = false;
				}
			);
		},

		// Calculate image size to fit inside viewport
		// ===========================================

		getFitPos: function(slide) {
			var self = this,
				$content = slide.$content,
				$slide = slide.$slide,
				width = slide.width || slide.opts.width,
				height = slide.height || slide.opts.height,
				maxWidth,
				maxHeight,
				minRatio,
				aspectRatio,
				rez = {};

			if (!slide.isLoaded || !$content || !$content.length) {
				return false;
			}

			maxWidth = $.fancybox.getTranslate(self.$refs.stage).width;
			maxHeight = $.fancybox.getTranslate(self.$refs.stage).height;

			maxWidth -=
				parseFloat($slide.css("paddingLeft")) +
				parseFloat($slide.css("paddingRight")) +
				parseFloat($content.css("marginLeft")) +
				parseFloat($content.css("marginRight"));

			maxHeight -=
				parseFloat($slide.css("paddingTop")) +
				parseFloat($slide.css("paddingBottom")) +
				parseFloat($content.css("marginTop")) +
				parseFloat($content.css("marginBottom"));

			if (!width || !height) {
				width = maxWidth;
				height = maxHeight;
			}

			minRatio = Math.min(1, maxWidth / width, maxHeight / height);

			width = minRatio * width;
			height = minRatio * height;

			// Adjust width/height to precisely fit into container
			if (width > maxWidth - 0.5) {
				width = maxWidth;
			}

			if (height > maxHeight - 0.5) {
				height = maxHeight;
			}

			if (slide.type === "image") {
				rez.top = Math.floor((maxHeight - height) * 0.5) + parseFloat($slide.css("paddingTop"));
				rez.left = Math.floor((maxWidth - width) * 0.5) + parseFloat($slide.css("paddingLeft"));
			} else if (slide.contentType === "video") {
				// Force aspect ratio for the video
				// "I say the whole world must learn of our peaceful ways… by force!"
				aspectRatio = slide.opts.width && slide.opts.height ? width / height : slide.opts.ratio || 16 / 9;

				if (height > width / aspectRatio) {
					height = width / aspectRatio;
				} else if (width > height * aspectRatio) {
					width = height * aspectRatio;
				}
			}

			rez.width = width;
			rez.height = height;

			return rez;
		},

		// Update content size and position for all slides
		// ==============================================

		update: function(e) {
			var self = this;

			$.each(self.slides, function(key, slide) {
				self.updateSlide(slide, e);
			});
		},

		// Update slide content position and size
		// ======================================

		updateSlide: function(slide, e) {
			var self = this,
				$content = slide && slide.$content,
				width = slide.width || slide.opts.width,
				height = slide.height || slide.opts.height,
				$slide = slide.$slide;

			// First, prevent caption overlap, if needed
			self.adjustCaption(slide);

			// Then resize content to fit inside the slide
			if ($content && (width || height || slide.contentType === "video") && !slide.hasError) {
				$.fancybox.stop($content);

				$.fancybox.setTranslate($content, self.getFitPos(slide));

				if (slide.pos === self.currPos) {
					self.isAnimating = false;

					self.updateCursor();
				}
			}

			// Then some adjustments
			self.adjustLayout(slide);

			if ($slide.length) {
				$slide.trigger("refresh");

				if (slide.pos === self.currPos) {
					self.$refs.toolbar
						.add(self.$refs.navigation.find(".fancybox-button--arrow_right"))
						.toggleClass("compensate-for-scrollbar", $slide.get(0).scrollHeight > $slide.get(0).clientHeight);
				}
			}

			self.trigger("onUpdate", slide, e);
		},

		// Horizontally center slide
		// =========================

		centerSlide: function(duration) {
			var self = this,
				current = self.current,
				$slide = current.$slide;

			if (self.isClosing || !current) {
				return;
			}

			$slide.siblings().css({
				transform: "",
				opacity: ""
			});

			$slide
				.parent()
				.children()
				.removeClass("fancybox-slide--previous fancybox-slide--next");

			$.fancybox.animate(
				$slide,
				{
					top: 0,
					left: 0,
					opacity: 1
				},
				duration === undefined ? 0 : duration,
				function() {
					// Clean up
					$slide.css({
						transform: "",
						opacity: ""
					});

					if (!current.isComplete) {
						self.complete();
					}
				},
				false
			);
		},

		// Check if current slide is moved (swiped)
		// ========================================

		isMoved: function(slide) {
			var current = slide || this.current,
				slidePos,
				stagePos;

			if (!current) {
				return false;
			}

			stagePos = $.fancybox.getTranslate(this.$refs.stage);
			slidePos = $.fancybox.getTranslate(current.$slide);

			return (
				!current.$slide.hasClass("fancybox-animated") &&
				(Math.abs(slidePos.top - stagePos.top) > 0.5 || Math.abs(slidePos.left - stagePos.left) > 0.5)
			);
		},

		// Update cursor style depending if content can be zoomed
		// ======================================================

		updateCursor: function(nextWidth, nextHeight) {
			var self = this,
				current = self.current,
				$container = self.$refs.container,
				canPan,
				isZoomable;

			if (!current || self.isClosing || !self.Guestures) {
				return;
			}

			$container.removeClass("fancybox-is-zoomable fancybox-can-zoomIn fancybox-can-zoomOut fancybox-can-swipe fancybox-can-pan");

			canPan = self.canPan(nextWidth, nextHeight);

			isZoomable = canPan ? true : self.isZoomable();

			$container.toggleClass("fancybox-is-zoomable", isZoomable);

			$("[data-fancybox-zoom]").prop("disabled", !isZoomable);

			if (canPan) {
				$container.addClass("fancybox-can-pan");
			} else if (
				isZoomable &&
				(current.opts.clickContent === "zoom" || ($.isFunction(current.opts.clickContent) && current.opts.clickContent(current) == "zoom"))
			) {
				$container.addClass("fancybox-can-zoomIn");
			} else if (current.opts.touch && (current.opts.touch.vertical || self.group.length > 1) && current.contentType !== "video") {
				$container.addClass("fancybox-can-swipe");
			}
		},

		// Check if current slide is zoomable
		// ==================================

		isZoomable: function() {
			var self = this,
				current = self.current,
				fitPos;

			// Assume that slide is zoomable if:
			//   - image is still loading
			//   - actual size of the image is smaller than available area
			if (current && !self.isClosing && current.type === "image" && !current.hasError) {
				if (!current.isLoaded) {
					return true;
				}

				fitPos = self.getFitPos(current);

				if (fitPos && (current.width > fitPos.width || current.height > fitPos.height)) {
					return true;
				}
			}

			return false;
		},

		// Check if current image dimensions are smaller than actual
		// =========================================================

		isScaledDown: function(nextWidth, nextHeight) {
			var self = this,
				rez = false,
				current = self.current,
				$content = current.$content;

			if (nextWidth !== undefined && nextHeight !== undefined) {
				rez = nextWidth < current.width && nextHeight < current.height;
			} else if ($content) {
				rez = $.fancybox.getTranslate($content);
				rez = rez.width < current.width && rez.height < current.height;
			}

			return rez;
		},

		// Check if image dimensions exceed parent element
		// ===============================================

		canPan: function(nextWidth, nextHeight) {
			var self = this,
				current = self.current,
				pos = null,
				rez = false;

			if (current.type === "image" && (current.isComplete || (nextWidth && nextHeight)) && !current.hasError) {
				rez = self.getFitPos(current);

				if (nextWidth !== undefined && nextHeight !== undefined) {
					pos = {width: nextWidth, height: nextHeight};
				} else if (current.isComplete) {
					pos = $.fancybox.getTranslate(current.$content);
				}

				if (pos && rez) {
					rez = Math.abs(pos.width - rez.width) > 1.5 || Math.abs(pos.height - rez.height) > 1.5;
				}
			}

			return rez;
		},

		// Load content into the slide
		// ===========================

		loadSlide: function(slide) {
			var self = this,
				type,
				$slide,
				ajaxLoad;

			if (slide.isLoading || slide.isLoaded) {
				return;
			}

			slide.isLoading = true;

			if (self.trigger("beforeLoad", slide) === false) {
				slide.isLoading = false;

				return false;
			}

			type = slide.type;
			$slide = slide.$slide;

			$slide
				.off("refresh")
				.trigger("onReset")
				.addClass(slide.opts.slideClass);

			// Create content depending on the type
			switch (type) {
				case "image":
					self.setImage(slide);

					break;

				case "iframe":
					self.setIframe(slide);

					break;

				case "html":
					self.setContent(slide, slide.src || slide.content);

					break;

				case "video":
					self.setContent(
						slide,
						slide.opts.video.tpl
							.replace(/\{\{src\}\}/gi, slide.src)
							.replace("{{format}}", slide.opts.videoFormat || slide.opts.video.format || "")
							.replace("{{poster}}", slide.thumb || "")
					);

					break;

				case "inline":
					if ($(slide.src).length) {
						self.setContent(slide, $(slide.src));
					} else {
						self.setError(slide);
					}

					break;

				case "ajax":
					self.showLoading(slide);

					ajaxLoad = $.ajax(
						$.extend({}, slide.opts.ajax.settings, {
							url: slide.src,
							success: function(data, textStatus) {
								if (textStatus === "success") {
									self.setContent(slide, data);
								}
							},
							error: function(jqXHR, textStatus) {
								if (jqXHR && textStatus !== "abort") {
									self.setError(slide);
								}
							}
						})
					);

					$slide.one("onReset", function() {
						ajaxLoad.abort();
					});

					break;

				default:
					self.setError(slide);

					break;
			}

			return true;
		},

		// Use thumbnail image, if possible
		// ================================

		setImage: function(slide) {
			var self = this,
				ghost;

			// Check if need to show loading icon
			setTimeout(function() {
				var $img = slide.$image;

				if (!self.isClosing && slide.isLoading && (!$img || !$img.length || !$img[0].complete) && !slide.hasError) {
					self.showLoading(slide);
				}
			}, 50);

			//Check if image has srcset
			self.checkSrcset(slide);

			// This will be wrapper containing both ghost and actual image
			slide.$content = $('<div class="fancybox-content"></div>')
				.addClass("fancybox-is-hidden")
				.appendTo(slide.$slide.addClass("fancybox-slide--image"));

			// If we have a thumbnail, we can display it while actual image is loading
			// Users will not stare at black screen and actual image will appear gradually
			if (slide.opts.preload !== false && slide.opts.width && slide.opts.height && slide.thumb) {
				slide.width = slide.opts.width;
				slide.height = slide.opts.height;

				ghost = document.createElement("img");

				ghost.onerror = function() {
					$(this).remove();

					slide.$ghost = null;
				};

				ghost.onload = function() {
					self.afterLoad(slide);
				};

				slide.$ghost = $(ghost)
					.addClass("fancybox-image")
					.appendTo(slide.$content)
					.attr("src", slide.thumb);
			}

			// Start loading actual image
			self.setBigImage(slide);
		},

		// Check if image has srcset and get the source
		// ============================================
		checkSrcset: function(slide) {
			var srcset = slide.opts.srcset || slide.opts.image.srcset,
				found,
				temp,
				pxRatio,
				windowWidth;

			// If we have "srcset", then we need to find first matching "src" value.
			// This is necessary, because when you set an src attribute, the browser will preload the image
			// before any javascript or even CSS is applied.
			if (srcset) {
				pxRatio = window.devicePixelRatio || 1;
				windowWidth = window.innerWidth * pxRatio;

				temp = srcset.split(",").map(function(el) {
					var ret = {};

					el.trim()
						.split(/\s+/)
						.forEach(function(el, i) {
							var value = parseInt(el.substring(0, el.length - 1), 10);

							if (i === 0) {
								return (ret.url = el);
							}

							if (value) {
								ret.value = value;
								ret.postfix = el[el.length - 1];
							}
						});

					return ret;
				});

				// Sort by value
				temp.sort(function(a, b) {
					return a.value - b.value;
				});

				// Ok, now we have an array of all srcset values
				for (var j = 0; j < temp.length; j++) {
					var el = temp[j];

					if ((el.postfix === "w" && el.value >= windowWidth) || (el.postfix === "x" && el.value >= pxRatio)) {
						found = el;
						break;
					}
				}

				// If not found, take the last one
				if (!found && temp.length) {
					found = temp[temp.length - 1];
				}

				if (found) {
					slide.src = found.url;

					// If we have default width/height values, we can calculate height for matching source
					if (slide.width && slide.height && found.postfix == "w") {
						slide.height = (slide.width / slide.height) * found.value;
						slide.width = found.value;
					}

					slide.opts.srcset = srcset;
				}
			}
		},

		// Create full-size image
		// ======================

		setBigImage: function(slide) {
			var self = this,
				img = document.createElement("img"),
				$img = $(img);

			slide.$image = $img
				.one("error", function() {
					self.setError(slide);
				})
				.one("load", function() {
					var sizes;

					if (!slide.$ghost) {
						self.resolveImageSlideSize(slide, this.naturalWidth, this.naturalHeight);

						self.afterLoad(slide);
					}

					if (self.isClosing) {
						return;
					}

					if (slide.opts.srcset) {
						sizes = slide.opts.sizes;

						if (!sizes || sizes === "auto") {
							sizes =
								(slide.width / slide.height > 1 && $W.width() / $W.height() > 1 ? "100" : Math.round((slide.width / slide.height) * 100)) +
								"vw";
						}

						$img.attr("sizes", sizes).attr("srcset", slide.opts.srcset);
					}

					// Hide temporary image after some delay
					if (slide.$ghost) {
						setTimeout(function() {
							if (slide.$ghost && !self.isClosing) {
								slide.$ghost.hide();
							}
						}, Math.min(300, Math.max(1000, slide.height / 1600)));
					}

					self.hideLoading(slide);
				})
				.addClass("fancybox-image")
				.attr("src", slide.src)
				.appendTo(slide.$content);

			if ((img.complete || img.readyState == "complete") && $img.naturalWidth && $img.naturalHeight) {
				$img.trigger("load");
			} else if (img.error) {
				$img.trigger("error");
			}
		},

		// Computes the slide size from image size and maxWidth/maxHeight
		// ==============================================================

		resolveImageSlideSize: function(slide, imgWidth, imgHeight) {
			var maxWidth = parseInt(slide.opts.width, 10),
				maxHeight = parseInt(slide.opts.height, 10);

			// Sets the default values from the image
			slide.width = imgWidth;
			slide.height = imgHeight;

			if (maxWidth > 0) {
				slide.width = maxWidth;
				slide.height = Math.floor((maxWidth * imgHeight) / imgWidth);
			}

			if (maxHeight > 0) {
				slide.width = Math.floor((maxHeight * imgWidth) / imgHeight);
				slide.height = maxHeight;
			}
		},

		// Create iframe wrapper, iframe and bindings
		// ==========================================

		setIframe: function(slide) {
			var self = this,
				opts = slide.opts.iframe,
				$slide = slide.$slide,
				$iframe;

			// Fix responsive iframes on iOS (along with `position:absolute;` for iframe element)
			if ($.fancybox.isMobile) {
				opts.css.overflow = "scroll";
			}

			slide.$content = $('<div class="fancybox-content' + (opts.preload ? " fancybox-is-hidden" : "") + '"></div>')
				.css(opts.css)
				.appendTo($slide);

			$slide.addClass("fancybox-slide--" + slide.contentType);

			slide.$iframe = $iframe = $(opts.tpl.replace(/\{rnd\}/g, new Date().getTime()))
				.attr(opts.attr)
				.appendTo(slide.$content);

			if (opts.preload) {
				self.showLoading(slide);

				// Unfortunately, it is not always possible to determine if iframe is successfully loaded
				// (due to browser security policy)

				$iframe.on("load.fb error.fb", function(e) {
					this.isReady = 1;

					slide.$slide.trigger("refresh");

					self.afterLoad(slide);
				});

				// Recalculate iframe content size
				// ===============================

				$slide.on("refresh.fb", function() {
					var $content = slide.$content,
						frameWidth = opts.css.width,
						frameHeight = opts.css.height,
						$contents,
						$body;

					if ($iframe[0].isReady !== 1) {
						return;
					}

					try {
						$contents = $iframe.contents();
						$body = $contents.find("body");
					} catch (ignore) {}

					// Calculate contnet dimensions if it is accessible
					if ($body && $body.length && $body.children().length) {
						// Avoid scrolling to top (if multiple instances)
						$slide.css("overflow", "visible");

						$content.css({
							width: "100%",
							"max-width": "100%",
							height: "9999px"
						});

						if (frameWidth === undefined) {
							frameWidth = Math.ceil(Math.max($body[0].clientWidth, $body.outerWidth(true)));
						}

						$content.css("width", frameWidth ? frameWidth : "").css("max-width", "");

						if (frameHeight === undefined) {
							frameHeight = Math.ceil(Math.max($body[0].clientHeight, $body.outerHeight(true)));
						}

						$content.css("height", frameHeight ? frameHeight : "");

						$slide.css("overflow", "auto");
					}

					$content.removeClass("fancybox-is-hidden");
				});
			} else {
				self.afterLoad(slide);
			}

			$iframe.attr("src", slide.src);

			// Remove iframe if closing or changing gallery item
			$slide.one("onReset", function() {
				// This helps IE not to throw errors when closing
				try {
					$(this)
						.find("iframe")
						.hide()
						.unbind()
						.attr("src", "//about:blank");
				} catch (ignore) {}

				$(this)
					.off("refresh.fb")
					.empty();

				slide.isLoaded = false;
				slide.isRevealed = false;
			});
		},

		// Wrap and append content to the slide
		// ======================================

		setContent: function(slide, content) {
			var self = this;

			if (self.isClosing) {
				return;
			}

			self.hideLoading(slide);

			if (slide.$content) {
				$.fancybox.stop(slide.$content);
			}

			slide.$slide.empty();

			// If content is a jQuery object, then it will be moved to the slide.
			// The placeholder is created so we will know where to put it back.
			if (isQuery(content) && content.parent().length) {
				// Make sure content is not already moved to fancyBox
				if (content.hasClass("fancybox-content") || content.parent().hasClass("fancybox-content")) {
					content.parents(".fancybox-slide").trigger("onReset");
				}

				// Create temporary element marking original place of the content
				slide.$placeholder = $("<div>")
					.hide()
					.insertAfter(content);

				// Make sure content is visible
				content.css("display", "inline-block");
			} else if (!slide.hasError) {
				// If content is just a plain text, try to convert it to html
				if ($.type(content) === "string") {
					content = $("<div>")
						.append($.trim(content))
						.contents();
				}

				// If "filter" option is provided, then filter content
				if (slide.opts.filter) {
					content = $("<div>")
						.html(content)
						.find(slide.opts.filter);
				}
			}

			slide.$slide.one("onReset", function() {
				// Pause all html5 video/audio
				$(this)
					.find("video,audio")
					.trigger("pause");

				// Put content back
				if (slide.$placeholder) {
					slide.$placeholder.after(content.removeClass("fancybox-content").hide()).remove();

					slide.$placeholder = null;
				}

				// Remove custom close button
				if (slide.$smallBtn) {
					slide.$smallBtn.remove();

					slide.$smallBtn = null;
				}

				// Remove content and mark slide as not loaded
				if (!slide.hasError) {
					$(this).empty();

					slide.isLoaded = false;
					slide.isRevealed = false;
				}
			});

			$(content).appendTo(slide.$slide);

			if ($(content).is("video,audio")) {
				$(content).addClass("fancybox-video");

				$(content).wrap("<div></div>");

				slide.contentType = "video";

				slide.opts.width = slide.opts.width || $(content).attr("width");
				slide.opts.height = slide.opts.height || $(content).attr("height");
			}

			slide.$content = slide.$slide
				.children()
				.filter("div,form,main,video,audio,article,.fancybox-content")
				.first();

			slide.$content.siblings().hide();

			// Re-check if there is a valid content
			// (in some cases, ajax response can contain various elements or plain text)
			if (!slide.$content.length) {
				slide.$content = slide.$slide
					.wrapInner("<div></div>")
					.children()
					.first();
			}

			slide.$content.addClass("fancybox-content");

			slide.$slide.addClass("fancybox-slide--" + slide.contentType);

			self.afterLoad(slide);
		},

		// Display error message
		// =====================

		setError: function(slide) {
			slide.hasError = true;

			slide.$slide
				.trigger("onReset")
				.removeClass("fancybox-slide--" + slide.contentType)
				.addClass("fancybox-slide--error");

			slide.contentType = "html";

			this.setContent(slide, this.translate(slide, slide.opts.errorTpl));

			if (slide.pos === this.currPos) {
				this.isAnimating = false;
			}
		},

		// Show loading icon inside the slide
		// ==================================

		showLoading: function(slide) {
			var self = this;

			slide = slide || self.current;

			if (slide && !slide.$spinner) {
				slide.$spinner = $(self.translate(self, self.opts.spinnerTpl))
					.appendTo(slide.$slide)
					.hide()
					.fadeIn("fast");
			}
		},

		// Remove loading icon from the slide
		// ==================================

		hideLoading: function(slide) {
			var self = this;

			slide = slide || self.current;

			if (slide && slide.$spinner) {
				slide.$spinner.stop().remove();

				delete slide.$spinner;
			}
		},

		// Adjustments after slide content has been loaded
		// ===============================================

		afterLoad: function(slide) {
			var self = this;

			if (self.isClosing) {
				return;
			}

			slide.isLoading = false;
			slide.isLoaded = true;

			self.trigger("afterLoad", slide);

			self.hideLoading(slide);

			// Add small close button
			if (slide.opts.smallBtn && (!slide.$smallBtn || !slide.$smallBtn.length)) {
				slide.$smallBtn = $(self.translate(slide, slide.opts.btnTpl.smallBtn)).appendTo(slide.$content);
			}

			// Disable right click
			if (slide.opts.protect && slide.$content && !slide.hasError) {
				slide.$content.on("contextmenu.fb", function(e) {
					if (e.button == 2) {
						e.preventDefault();
					}

					return true;
				});

				// Add fake element on top of the image
				// This makes a bit harder for user to select image
				if (slide.type === "image") {
					$('<div class="fancybox-spaceball"></div>').appendTo(slide.$content);
				}
			}

			self.adjustCaption(slide);

			self.adjustLayout(slide);

			if (slide.pos === self.currPos) {
				self.updateCursor();
			}

			self.revealContent(slide);
		},

		// Prevent caption overlap,
		// fix css inconsistency across browsers
		// =====================================

		adjustCaption: function(slide) {
			var self = this,
				current = slide || self.current,
				caption = current.opts.caption,
				$caption = self.$refs.caption,
				captionH = false;

			if (current.opts.preventCaptionOverlap && caption && caption.length) {
				if (current.pos !== self.currPos) {
					$caption = $caption
						.clone()
						.empty()
						.appendTo($caption.parent());

					$caption.html(caption);

					captionH = $caption.outerHeight(true);

					$caption.empty().remove();
				} else if (self.$caption) {
					captionH = self.$caption.outerHeight(true);
				}

				current.$slide.css("padding-bottom", captionH || "");
			}
		},

		// Simple hack to fix inconsistency across browsers, described here (affects Edge, too):
		// https://bugzilla.mozilla.org/show_bug.cgi?id=748518
		// ====================================================================================

		adjustLayout: function(slide) {
			var self = this,
				current = slide || self.current,
				scrollHeight,
				marginBottom,
				inlinePadding,
				actualPadding;

			if (current.isLoaded && current.opts.disableLayoutFix !== true) {
				current.$content.css("margin-bottom", "");

				// If we would always set margin-bottom for the content,
				// then it would potentially break vertical align
				if (current.$content.outerHeight() > current.$slide.height() + 0.5) {
					inlinePadding = current.$slide[0].style["padding-bottom"];
					actualPadding = current.$slide.css("padding-bottom");

					if (parseFloat(actualPadding) > 0) {
						scrollHeight = current.$slide[0].scrollHeight;

						current.$slide.css("padding-bottom", 0);

						if (Math.abs(scrollHeight - current.$slide[0].scrollHeight) < 1) {
							marginBottom = actualPadding;
						}

						current.$slide.css("padding-bottom", inlinePadding);
					}
				}

				current.$content.css("margin-bottom", marginBottom);
			}
		},

		// Make content visible
		// This method is called right after content has been loaded or
		// user navigates gallery and transition should start
		// ============================================================

		revealContent: function(slide) {
			var self = this,
				$slide = slide.$slide,
				end = false,
				start = false,
				isMoved = self.isMoved(slide),
				isRevealed = slide.isRevealed,
				effect,
				effectClassName,
				duration,
				opacity;

			slide.isRevealed = true;

			effect = slide.opts[self.firstRun ? "animationEffect" : "transitionEffect"];
			duration = slide.opts[self.firstRun ? "animationDuration" : "transitionDuration"];

			duration = parseInt(slide.forcedDuration === undefined ? duration : slide.forcedDuration, 10);

			if (isMoved || slide.pos !== self.currPos || !duration) {
				effect = false;
			}

			// Check if can zoom
			if (effect === "zoom") {
				if (slide.pos === self.currPos && duration && slide.type === "image" && !slide.hasError && (start = self.getThumbPos(slide))) {
					end = self.getFitPos(slide);
				} else {
					effect = "fade";
				}
			}

			// Zoom animation
			// ==============
			if (effect === "zoom") {
				self.isAnimating = true;

				end.scaleX = end.width / start.width;
				end.scaleY = end.height / start.height;

				// Check if we need to animate opacity
				opacity = slide.opts.zoomOpacity;

				if (opacity == "auto") {
					opacity = Math.abs(slide.width / slide.height - start.width / start.height) > 0.1;
				}

				if (opacity) {
					start.opacity = 0.1;
					end.opacity = 1;
				}

				// Draw image at start position
				$.fancybox.setTranslate(slide.$content.removeClass("fancybox-is-hidden"), start);

				forceRedraw(slide.$content);

				// Start animation
				$.fancybox.animate(slide.$content, end, duration, function() {
					self.isAnimating = false;

					self.complete();
				});

				return;
			}

			self.updateSlide(slide);

			// Simply show content if no effect
			// ================================
			if (!effect) {
				slide.$content.removeClass("fancybox-is-hidden");

				if (!isRevealed && isMoved && slide.type === "image" && !slide.hasError) {
					slide.$content.hide().fadeIn("fast");
				}

				if (slide.pos === self.currPos) {
					self.complete();
				}

				return;
			}

			// Prepare for CSS transiton
			// =========================
			$.fancybox.stop($slide);

			//effectClassName = "fancybox-animated fancybox-slide--" + (slide.pos >= self.prevPos ? "next" : "previous") + " fancybox-fx-" + effect;
			effectClassName = "fancybox-slide--" + (slide.pos >= self.prevPos ? "next" : "previous") + " fancybox-animated fancybox-fx-" + effect;

			$slide.addClass(effectClassName).removeClass("fancybox-slide--current"); //.addClass(effectClassName);

			slide.$content.removeClass("fancybox-is-hidden");

			// Force reflow
			forceRedraw($slide);

			if (slide.type !== "image") {
				slide.$content.hide().show(0);
			}

			$.fancybox.animate(
				$slide,
				"fancybox-slide--current",
				duration,
				function() {
					$slide.removeClass(effectClassName).css({
						transform: "",
						opacity: ""
					});

					if (slide.pos === self.currPos) {
						self.complete();
					}
				},
				true
			);
		},

		// Check if we can and have to zoom from thumbnail
		//================================================

		getThumbPos: function(slide) {
			var rez = false,
				$thumb = slide.$thumb,
				thumbPos,
				btw,
				brw,
				bbw,
				blw;

			if (!$thumb || !inViewport($thumb[0])) {
				return false;
			}

			thumbPos = $.fancybox.getTranslate($thumb);

			btw = parseFloat($thumb.css("border-top-width") || 0);
			brw = parseFloat($thumb.css("border-right-width") || 0);
			bbw = parseFloat($thumb.css("border-bottom-width") || 0);
			blw = parseFloat($thumb.css("border-left-width") || 0);

			rez = {
				top: thumbPos.top + btw,
				left: thumbPos.left + blw,
				width: thumbPos.width - brw - blw,
				height: thumbPos.height - btw - bbw,
				scaleX: 1,
				scaleY: 1
			};

			return thumbPos.width > 0 && thumbPos.height > 0 ? rez : false;
		},

		// Final adjustments after current gallery item is moved to position
		// and it`s content is loaded
		// ==================================================================

		complete: function() {
			var self = this,
				current = self.current,
				slides = {},
				$el;

			if (self.isMoved() || !current.isLoaded) {
				return;
			}

			if (!current.isComplete) {
				current.isComplete = true;

				current.$slide.siblings().trigger("onReset");

				self.preload("inline");

				// Trigger any CSS transiton inside the slide
				forceRedraw(current.$slide);

				current.$slide.addClass("fancybox-slide--complete");

				// Remove unnecessary slides
				$.each(self.slides, function(key, slide) {
					if (slide.pos >= self.currPos - 1 && slide.pos <= self.currPos + 1) {
						slides[slide.pos] = slide;
					} else if (slide) {
						$.fancybox.stop(slide.$slide);

						slide.$slide.off().remove();
					}
				});

				self.slides = slides;
			}

			self.isAnimating = false;

			self.updateCursor();

			self.trigger("afterShow");

			// Autoplay first html5 video/audio
			if (!!current.opts.video.autoStart) {
				current.$slide
					.find("video,audio")
					.filter(":visible:first")
					.trigger("play")
					.one("ended", function() {
						if (this.webkitExitFullscreen) {
							this.webkitExitFullscreen();
						}

						self.next();
					});
			}

			// Try to focus on the first focusable element
			if (current.opts.autoFocus && current.contentType === "html") {
				// Look for the first input with autofocus attribute
				$el = current.$content.find("input[autofocus]:enabled:visible:first");

				if ($el.length) {
					$el.trigger("focus");
				} else {
					self.focus(null, true);
				}
			}

			// Avoid jumping
			current.$slide.scrollTop(0).scrollLeft(0);
		},

		// Preload next and previous slides
		// ================================

		preload: function(type) {
			var self = this,
				prev,
				next;

			if (self.group.length < 2) {
				return;
			}

			next = self.slides[self.currPos + 1];
			prev = self.slides[self.currPos - 1];

			if (prev && prev.type === type) {
				self.loadSlide(prev);
			}

			if (next && next.type === type) {
				self.loadSlide(next);
			}
		},

		// Try to find and focus on the first focusable element
		// ====================================================

		focus: function(e, firstRun) {
			var self = this,
				focusableStr = [
					"a[href]",
					"area[href]",
					'input:not([disabled]):not([type="hidden"]):not([aria-hidden])',
					"select:not([disabled]):not([aria-hidden])",
					"textarea:not([disabled]):not([aria-hidden])",
					"button:not([disabled]):not([aria-hidden])",
					"iframe",
					"object",
					"embed",
					"[contenteditable]",
					'[tabindex]:not([tabindex^="-"])'
				].join(","),
				focusableItems,
				focusedItemIndex;

			if (self.isClosing) {
				return;
			}

			if (e || !self.current || !self.current.isComplete) {
				// Focus on any element inside fancybox
				focusableItems = self.$refs.container.find("*:visible");
			} else {
				// Focus inside current slide
				focusableItems = self.current.$slide.find("*:visible" + (firstRun ? ":not(.fancybox-close-small)" : ""));
			}

			focusableItems = focusableItems.filter(focusableStr).filter(function() {
				return $(this).css("visibility") !== "hidden" && !$(this).hasClass("disabled");
			});

			if (focusableItems.length) {
				focusedItemIndex = focusableItems.index(document.activeElement);

				if (e && e.shiftKey) {
					// Back tab
					if (focusedItemIndex < 0 || focusedItemIndex == 0) {
						e.preventDefault();

						focusableItems.eq(focusableItems.length - 1).trigger("focus");
					}
				} else {
					// Outside or Forward tab
					if (focusedItemIndex < 0 || focusedItemIndex == focusableItems.length - 1) {
						if (e) {
							e.preventDefault();
						}

						focusableItems.eq(0).trigger("focus");
					}
				}
			} else {
				self.$refs.container.trigger("focus");
			}
		},

		// Activates current instance - brings container to the front and enables keyboard,
		// notifies other instances about deactivating
		// =================================================================================

		activate: function() {
			var self = this;

			// Deactivate all instances
			$(".fancybox-container").each(function() {
				var instance = $(this).data("FancyBox");

				// Skip self and closing instances
				if (instance && instance.id !== self.id && !instance.isClosing) {
					instance.trigger("onDeactivate");

					instance.removeEvents();

					instance.isVisible = false;
				}
			});

			self.isVisible = true;

			if (self.current || self.isIdle) {
				self.update();

				self.updateControls();
			}

			self.trigger("onActivate");

			self.addEvents();
		},

		// Start closing procedure
		// This will start "zoom-out" animation if needed and clean everything up afterwards
		// =================================================================================

		close: function(e, d) {
			var self = this,
				current = self.current,
				effect,
				duration,
				$content,
				domRect,
				opacity,
				start,
				end;

			var done = function() {
				self.cleanUp(e);
			};

			if (self.isClosing) {
				return false;
			}

			self.isClosing = true;

			// If beforeClose callback prevents closing, make sure content is centered
			if (self.trigger("beforeClose", e) === false) {
				self.isClosing = false;

				requestAFrame(function() {
					self.update();
				});

				return false;
			}

			// Remove all events
			// If there are multiple instances, they will be set again by "activate" method
			self.removeEvents();

			$content = current.$content;
			effect = current.opts.animationEffect;
			duration = $.isNumeric(d) ? d : effect ? current.opts.animationDuration : 0;

			current.$slide.removeClass("fancybox-slide--complete fancybox-slide--next fancybox-slide--previous fancybox-animated");

			if (e !== true) {
				$.fancybox.stop(current.$slide);
			} else {
				effect = false;
			}

			// Remove other slides
			current.$slide
				.siblings()
				.trigger("onReset")
				.remove();

			// Trigger animations
			if (duration) {
				self.$refs.container
					.removeClass("fancybox-is-open")
					.addClass("fancybox-is-closing")
					.css("transition-duration", duration + "ms");
			}

			// Clean up
			self.hideLoading(current);

			self.hideControls(true);

			self.updateCursor();

			// Check if possible to zoom-out
			if (
				effect === "zoom" &&
				!($content && duration && current.type === "image" && !self.isMoved() && !current.hasError && (end = self.getThumbPos(current)))
			) {
				effect = "fade";
			}

			if (effect === "zoom") {
				$.fancybox.stop($content);

				domRect = $.fancybox.getTranslate($content);

				start = {
					top: domRect.top,
					left: domRect.left,
					scaleX: domRect.width / end.width,
					scaleY: domRect.height / end.height,
					width: end.width,
					height: end.height
				};

				// Check if we need to animate opacity
				opacity = current.opts.zoomOpacity;

				if (opacity == "auto") {
					opacity = Math.abs(current.width / current.height - end.width / end.height) > 0.1;
				}

				if (opacity) {
					end.opacity = 0;
				}

				$.fancybox.setTranslate($content, start);

				forceRedraw($content);

				$.fancybox.animate($content, end, duration, done);

				return true;
			}

			if (effect && duration) {
				$.fancybox.animate(
					current.$slide.addClass("fancybox-slide--previous").removeClass("fancybox-slide--current"),
					"fancybox-animated fancybox-fx-" + effect,
					duration,
					done
				);
			} else {
				// If skip animation
				if (e === true) {
					setTimeout(done, duration);
				} else {
					done();
				}
			}

			return true;
		},

		// Final adjustments after removing the instance
		// =============================================

		cleanUp: function(e) {
			var self = this,
				instance,
				$focus = self.current.opts.$orig,
				x,
				y;

			self.current.$slide.trigger("onReset");

			self.$refs.container.empty().remove();

			self.trigger("afterClose", e);

			// Place back focus
			if (!!self.current.opts.backFocus) {
				if (!$focus || !$focus.length || !$focus.is(":visible")) {
					$focus = self.$trigger;
				}

				if ($focus && $focus.length) {
					x = window.scrollX;
					y = window.scrollY;

					$focus.trigger("focus");

					$("html, body")
						.scrollTop(y)
						.scrollLeft(x);
				}
			}

			self.current = null;

			// Check if there are other instances
			instance = $.fancybox.getInstance();

			if (instance) {
				instance.activate();
			} else {
				$("body").removeClass("fancybox-active compensate-for-scrollbar");

				$("#fancybox-style-noscroll").remove();
			}
		},

		// Call callback and trigger an event
		// ==================================

		trigger: function(name, slide) {
			var args = Array.prototype.slice.call(arguments, 1),
				self = this,
				obj = slide && slide.opts ? slide : self.current,
				rez;

			if (obj) {
				args.unshift(obj);
			} else {
				obj = self;
			}

			args.unshift(self);

			if ($.isFunction(obj.opts[name])) {
				rez = obj.opts[name].apply(obj, args);
			}

			if (rez === false) {
				return rez;
			}

			if (name === "afterClose" || !self.$refs) {
				$D.trigger(name + ".fb", args);
			} else {
				self.$refs.container.trigger(name + ".fb", args);
			}
		},

		// Update infobar values, navigation button states and reveal caption
		// ==================================================================

		updateControls: function() {
			var self = this,
				current = self.current,
				index = current.index,
				$container = self.$refs.container,
				$caption = self.$refs.caption,
				caption = current.opts.caption;

			// Recalculate content dimensions
			current.$slide.trigger("refresh");

			self.$caption = caption && caption.length ? $caption.html(caption) : null;

			if (!self.hasHiddenControls && !self.isIdle) {
				self.showControls();
			}

			// Update info and navigation elements
			$container.find("[data-fancybox-count]").html(self.group.length);
			$container.find("[data-fancybox-index]").html(index + 1);

			$container.find("[data-fancybox-prev]").prop("disabled", !current.opts.loop && index <= 0);
			$container.find("[data-fancybox-next]").prop("disabled", !current.opts.loop && index >= self.group.length - 1);

			if (current.type === "image") {
				// Re-enable buttons; update download button source
				$container
					.find("[data-fancybox-zoom]")
					.show()
					.end()
					.find("[data-fancybox-download]")
					.attr("href", current.opts.image.src || current.src)
					.show();
			} else if (current.opts.toolbar) {
				$container.find("[data-fancybox-download],[data-fancybox-zoom]").hide();
			}

			// Make sure focus is not on disabled button/element
			if ($(document.activeElement).is(":hidden,[disabled]")) {
				self.$refs.container.trigger("focus");
			}
		},

		// Hide toolbar and caption
		// ========================

		hideControls: function(andCaption) {
			var self = this,
				arr = ["infobar", "toolbar", "nav"];

			if (andCaption || !self.current.opts.preventCaptionOverlap) {
				arr.push("caption");
			}

			this.$refs.container.removeClass(
				arr
					.map(function(i) {
						return "fancybox-show-" + i;
					})
					.join(" ")
			);

			this.hasHiddenControls = true;
		},

		showControls: function() {
			var self = this,
				opts = self.current ? self.current.opts : self.opts,
				$container = self.$refs.container;

			self.hasHiddenControls = false;
			self.idleSecondsCounter = 0;

			$container
				.toggleClass("fancybox-show-toolbar", !!(opts.toolbar && opts.buttons))
				.toggleClass("fancybox-show-infobar", !!(opts.infobar && self.group.length > 1))
				.toggleClass("fancybox-show-caption", !!self.$caption)
				.toggleClass("fancybox-show-nav", !!(opts.arrows && self.group.length > 1))
				.toggleClass("fancybox-is-modal", !!opts.modal);
		},

		// Toggle toolbar and caption
		// ==========================

		toggleControls: function() {
			if (this.hasHiddenControls) {
				this.showControls();
			} else {
				this.hideControls();
			}
		}
	});

	$.fancybox = {
		version: "3.5.2",
		defaults: defaults,

		// Get current instance and execute a command.
		//
		// Examples of usage:
		//
		//   $instance = $.fancybox.getInstance();
		//   $.fancybox.getInstance().jumpTo( 1 );
		//   $.fancybox.getInstance( 'jumpTo', 1 );
		//   $.fancybox.getInstance( function() {
		//       console.info( this.currIndex );
		//   });
		// ======================================================

		getInstance: function(command) {
			var instance = $('.fancybox-container:not(".fancybox-is-closing"):last').data("FancyBox"),
				args = Array.prototype.slice.call(arguments, 1);

			if (instance instanceof FancyBox) {
				if ($.type(command) === "string") {
					instance[command].apply(instance, args);
				} else if ($.type(command) === "function") {
					command.apply(instance, args);
				}

				return instance;
			}

			return false;
		},

		// Create new instance
		// ===================

		open: function(items, opts, index) {
			return new FancyBox(items, opts, index);
		},

		// Close current or all instances
		// ==============================

		close: function(all) {
			var instance = this.getInstance();

			if (instance) {
				instance.close();

				// Try to find and close next instance
				if (all === true) {
					this.close(all);
				}
			}
		},

		// Close all instances and unbind all events
		// =========================================

		destroy: function() {
			this.close(true);

			$D.add("body").off("click.fb-start", "**");
		},

		// Try to detect mobile devices
		// ============================

		isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),

		// Detect if 'translate3d' support is available
		// ============================================

		use3d: (function() {
			var div = document.createElement("div");

			return (
				window.getComputedStyle &&
				window.getComputedStyle(div) &&
				window.getComputedStyle(div).getPropertyValue("transform") &&
				!(document.documentMode && document.documentMode < 11)
			);
		})(),

		// Helper function to get current visual state of an element
		// returns array[ top, left, horizontal-scale, vertical-scale, opacity ]
		// =====================================================================

		getTranslate: function($el) {
			var domRect;

			if (!$el || !$el.length) {
				return false;
			}

			domRect = $el[0].getBoundingClientRect();

			return {
				top: domRect.top || 0,
				left: domRect.left || 0,
				width: domRect.width,
				height: domRect.height,
				opacity: parseFloat($el.css("opacity"))
			};
		},

		// Shortcut for setting "translate3d" properties for element
		// Can set be used to set opacity, too
		// ========================================================

		setTranslate: function($el, props) {
			var str = "",
				css = {};

			if (!$el || !props) {
				return;
			}

			if (props.left !== undefined || props.top !== undefined) {
				str =
					(props.left === undefined ? $el.position().left : props.left) +
					"px, " +
					(props.top === undefined ? $el.position().top : props.top) +
					"px";

				if (this.use3d) {
					str = "translate3d(" + str + ", 0px)";
				} else {
					str = "translate(" + str + ")";
				}
			}

			if (props.scaleX !== undefined && props.scaleY !== undefined) {
				str += " scale(" + props.scaleX + ", " + props.scaleY + ")";
			} else if (props.scaleX !== undefined) {
				str += " scaleX(" + props.scaleX + ")";
			}

			if (str.length) {
				css.transform = str;
			}

			if (props.opacity !== undefined) {
				css.opacity = props.opacity;
			}

			if (props.width !== undefined) {
				css.width = props.width;
			}

			if (props.height !== undefined) {
				css.height = props.height;
			}

			return $el.css(css);
		},

		// Simple CSS transition handler
		// =============================

		animate: function($el, to, duration, callback, leaveAnimationName) {
			var self = this,
				from;

			if ($.isFunction(duration)) {
				callback = duration;
				duration = null;
			}

			self.stop($el);

			from = self.getTranslate($el);

			$el.on(transitionEnd, function(e) {
				// Skip events from child elements and z-index change
				if (e && e.originalEvent && (!$el.is(e.originalEvent.target) || e.originalEvent.propertyName == "z-index")) {
					return;
				}

				self.stop($el);

				if ($.isNumeric(duration)) {
					$el.css("transition-duration", "");
				}

				if ($.isPlainObject(to)) {
					if (to.scaleX !== undefined && to.scaleY !== undefined) {
						self.setTranslate($el, {
							top: to.top,
							left: to.left,
							width: from.width * to.scaleX,
							height: from.height * to.scaleY,
							scaleX: 1,
							scaleY: 1
						});
					}
				} else if (leaveAnimationName !== true) {
					$el.removeClass(to);
				}

				if ($.isFunction(callback)) {
					callback(e);
				}
			});

			if ($.isNumeric(duration)) {
				$el.css("transition-duration", duration + "ms");
			}

			// Start animation by changing CSS properties or class name
			if ($.isPlainObject(to)) {
				if (to.scaleX !== undefined && to.scaleY !== undefined) {
					delete to.width;
					delete to.height;

					if ($el.parent().hasClass("fancybox-slide--image")) {
						$el.parent().addClass("fancybox-is-scaling");
					}
				}

				$.fancybox.setTranslate($el, to);
			} else {
				$el.addClass(to);
			}

			// Make sure that `transitionend` callback gets fired
			$el.data(
				"timer",
				setTimeout(function() {
					$el.trigger(transitionEnd);
				}, duration + 33)
			);
		},

		stop: function($el, callCallback) {
			if ($el && $el.length) {
				clearTimeout($el.data("timer"));

				if (callCallback) {
					$el.trigger(transitionEnd);
				}

				$el.off(transitionEnd).css("transition-duration", "");

				$el.parent().removeClass("fancybox-is-scaling");
			}
		}
	};

	// Default click handler for "fancyboxed" links
	// ============================================

	function _run(e, opts) {
		var items = [],
			index = 0,
			$target,
			value,
			instance;

		// Avoid opening multiple times
		if (e && e.isDefaultPrevented()) {
			return;
		}

		e.preventDefault();

		opts = opts || {};

		if (e && e.data) {
			opts = mergeOpts(e.data.options, opts);
		}

		$target = opts.$target || $(e.currentTarget).trigger("blur");
		instance = $.fancybox.getInstance();

		if (instance && instance.$trigger && instance.$trigger.is($target)) {
			return;
		}

		if (opts.selector) {
			items = $(opts.selector);
		} else {
			// Get all related items and find index for clicked one
			value = $target.attr("data-fancybox") || "";

			if (value) {
				items = e.data ? e.data.items : [];
				items = items.length ? items.filter('[data-fancybox="' + value + '"]') : $('[data-fancybox="' + value + '"]');
			} else {
				items = [$target];
			}
		}

		index = $(items).index($target);

		// Sometimes current item can not be found
		if (index < 0) {
			index = 0;
		}

		instance = $.fancybox.open(items, opts, index);

		// Save last active element
		instance.$trigger = $target;
	}

	// Create a jQuery plugin
	// ======================

	$.fn.fancybox = function(options) {
		var selector;

		options = options || {};
		selector = options.selector || false;

		if (selector) {
			// Use body element instead of document so it executes first
			$("body")
				.off("click.fb-start", selector)
				.on("click.fb-start", selector, {options: options}, _run);
		} else {
			this.off("click.fb-start").on(
				"click.fb-start",
				{
					items: this,
					options: options
				},
				_run
			);
		}

		return this;
	};

	// Self initializing plugin for all elements having `data-fancybox` attribute
	// ==========================================================================

	$D.on("click.fb-start", "[data-fancybox]", _run);

	// Enable "trigger elements"
	// =========================

	$D.on("click.fb-start", "[data-fancybox-trigger]", function(e) {
		$('[data-fancybox="' + $(this).attr("data-fancybox-trigger") + '"]')
			.eq($(this).attr("data-fancybox-index") || 0)
			.trigger("click.fb-start", {
				$trigger: $(this)
			});
	});

	// Track focus event for better accessibility styling
	// ==================================================
	(function() {
		var buttonStr = ".fancybox-button",
			focusStr = "fancybox-focus",
			$pressed = null;

		$D.on("mousedown mouseup focus blur", buttonStr, function(e) {
			switch (e.type) {
				case "mousedown":
					$pressed = $(this);
					break;
				case "mouseup":
					$pressed = null;
					break;
				case "focusin":
					$(buttonStr).removeClass(focusStr);

					if (!$(this).is($pressed) && !$(this).is("[disabled]")) {
						$(this).addClass(focusStr);
					}
					break;
				case "focusout":
					$(buttonStr).removeClass(focusStr);
					break;
			}
		});
	})();
})(window, document, jQuery);

// ==========================================================================
//
// Media
// Adds additional media type support
//
// ==========================================================================
(function($) {
	"use strict";

	// Object containing properties for each media type
	var defaults = {
		youtube: {
			matcher: /(youtube\.com|youtu\.be|youtube\-nocookie\.com)\/(watch\?(.*&)?v=|v\/|u\/|embed\/?)?(videoseries\?list=(.*)|[\w-]{11}|\?listType=(.*)&list=(.*))(.*)/i,
			params: {
				autoplay: 1,
				autohide: 1,
				fs: 1,
				rel: 0,
				hd: 1,
				wmode: "transparent",
				enablejsapi: 1,
				html5: 1
			},
			paramPlace: 8,
			type: "iframe",
			url: "//www.youtube-nocookie.com/embed/$4",
			thumb: "//img.youtube.com/vi/$4/hqdefault.jpg"
		},

		vimeo: {
			matcher: /^.+vimeo.com\/(.*\/)?([\d]+)(.*)?/,
			params: {
				autoplay: 1,
				hd: 1,
				show_title: 1,
				show_byline: 1,
				show_portrait: 0,
				fullscreen: 1
			},
			paramPlace: 3,
			type: "iframe",
			url: "//player.vimeo.com/video/$2"
		},

		instagram: {
			matcher: /(instagr\.am|instagram\.com)\/p\/([a-zA-Z0-9_\-]+)\/?/i,
			type: "image",
			url: "//$1/p/$2/media/?size=l"
		},

		// Examples:
		// http://maps.google.com/?ll=48.857995,2.294297&spn=0.007666,0.021136&t=m&z=16
		// https://www.google.com/maps/@37.7852006,-122.4146355,14.65z
		// https://www.google.com/maps/@52.2111123,2.9237542,6.61z?hl=en
		// https://www.google.com/maps/place/Googleplex/@37.4220041,-122.0833494,17z/data=!4m5!3m4!1s0x0:0x6c296c66619367e0!8m2!3d37.4219998!4d-122.0840572
		gmap_place: {
			matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(((maps\/(place\/(.*)\/)?\@(.*),(\d+.?\d+?)z))|(\?ll=))(.*)?/i,
			type: "iframe",
			url: function(rez) {
				return (
					"//maps.google." +
					rez[2] +
					"/?ll=" +
					(rez[9] ? rez[9] + "&z=" + Math.floor(rez[10]) + (rez[12] ? rez[12].replace(/^\//, "&") : "") : rez[12] + "").replace(/\?/, "&") +
					"&output=" +
					(rez[12] && rez[12].indexOf("layer=c") > 0 ? "svembed" : "embed")
				);
			}
		},

		// Examples:
		// https://www.google.com/maps/search/Empire+State+Building/
		// https://www.google.com/maps/search/?api=1&query=centurylink+field
		// https://www.google.com/maps/search/?api=1&query=47.5951518,-122.3316393
		gmap_search: {
			matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(maps\/search\/)(.*)/i,
			type: "iframe",
			url: function(rez) {
				return "//maps.google." + rez[2] + "/maps?q=" + rez[5].replace("query=", "q=").replace("api=1", "") + "&output=embed";
			}
		}
	};

	// Formats matching url to final form
	var format = function(url, rez, params) {
		if (!url) {
			return;
		}

		params = params || "";

		if ($.type(params) === "object") {
			params = $.param(params, true);
		}

		$.each(rez, function(key, value) {
			url = url.replace("$" + key, value || "");
		});

		if (params.length) {
			url += (url.indexOf("?") > 0 ? "&" : "?") + params;
		}

		return url;
	};

	$(document).on("objectNeedsType.fb", function(e, instance, item) {
		var url = item.src || "",
			type = false,
			media,
			thumb,
			rez,
			params,
			urlParams,
			paramObj,
			provider;

		media = $.extend(true, {}, defaults, item.opts.media);

		// Look for any matching media type
		$.each(media, function(providerName, providerOpts) {
			rez = url.match(providerOpts.matcher);

			if (!rez) {
				return;
			}

			type = providerOpts.type;
			provider = providerName;
			paramObj = {};

			if (providerOpts.paramPlace && rez[providerOpts.paramPlace]) {
				urlParams = rez[providerOpts.paramPlace];

				if (urlParams[0] == "?") {
					urlParams = urlParams.substring(1);
				}

				urlParams = urlParams.split("&");

				for (var m = 0; m < urlParams.length; ++m) {
					var p = urlParams[m].split("=", 2);

					if (p.length == 2) {
						paramObj[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
					}
				}
			}

			params = $.extend(true, {}, providerOpts.params, item.opts[providerName], paramObj);

			url =
				$.type(providerOpts.url) === "function" ? providerOpts.url.call(this, rez, params, item) : format(providerOpts.url, rez, params);

			thumb =
				$.type(providerOpts.thumb) === "function" ? providerOpts.thumb.call(this, rez, params, item) : format(providerOpts.thumb, rez);

			if (providerName === "youtube") {
				url = url.replace(/&t=((\d+)m)?(\d+)s/, function(match, p1, m, s) {
					return "&start=" + ((m ? parseInt(m, 10) * 60 : 0) + parseInt(s, 10));
				});
			} else if (providerName === "vimeo") {
				url = url.replace("&%23", "#");
			}

			return false;
		});

		// If it is found, then change content type and update the url

		if (type) {
			if (!item.opts.thumb && !(item.opts.$thumb && item.opts.$thumb.length)) {
				item.opts.thumb = thumb;
			}

			if (type === "iframe") {
				item.opts = $.extend(true, item.opts, {
					iframe: {
						preload: false,
						attr: {
							scrolling: "no"
						}
					}
				});
			}

			$.extend(item, {
				type: type,
				src: url,
				origSrc: item.src,
				contentSource: provider,
				contentType: type === "image" ? "image" : provider == "gmap_place" || provider == "gmap_search" ? "map" : "video"
			});
		} else if (url) {
			item.type = item.opts.defaultType;
		}
	});

	// Load YouTube/Video API on request to detect when video finished playing
	var VideoAPILoader = {
		youtube: {
			src: "https://www.youtube.com/iframe_api",
			class: "YT",
			loading: false,
			loaded: false
		},

		vimeo: {
			src: "https://player.vimeo.com/api/player.js",
			class: "Vimeo",
			loading: false,
			loaded: false
		},

		load: function(vendor) {
			var _this = this,
				script;

			if (this[vendor].loaded) {
				setTimeout(function() {
					_this.done(vendor);
				});
				return;
			}

			if (this[vendor].loading) {
				return;
			}

			this[vendor].loading = true;

			script = document.createElement("script");
			script.type = "text/javascript";
			script.src = this[vendor].src;

			if (vendor === "youtube") {
				window.onYouTubeIframeAPIReady = function() {
					_this[vendor].loaded = true;
					_this.done(vendor);
				};
			} else {
				script.onload = function() {
					_this[vendor].loaded = true;
					_this.done(vendor);
				};
			}

			document.body.appendChild(script);
		},
		done: function(vendor) {
			var instance, $el, player;

			if (vendor === "youtube") {
				delete window.onYouTubeIframeAPIReady;
			}

			instance = $.fancybox.getInstance();

			if (instance) {
				$el = instance.current.$content.find("iframe");

				if (vendor === "youtube" && YT !== undefined && YT) {
					player = new YT.Player($el.attr("id"), {
						events: {
							onStateChange: function(e) {
								if (e.data == 0) {
									instance.next();
								}
							}
						}
					});
				} else if (vendor === "vimeo" && Vimeo !== undefined && Vimeo) {
					player = new Vimeo.Player($el);

					player.on("ended", function() {
						instance.next();
					});
				}
			}
		}
	};

	$(document).on({
		"afterShow.fb": function(e, instance, current) {
			if (instance.group.length > 1 && (current.contentSource === "youtube" || current.contentSource === "vimeo")) {
				VideoAPILoader.load(current.contentSource);
			}
		}
	});
})(jQuery);

// ==========================================================================
//
// Guestures
// Adds touch guestures, handles click and tap events
//
// ==========================================================================
(function(window, document, $) {
	"use strict";

	var requestAFrame = (function() {
		return (
			window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			// if all else fails, use setTimeout
			function(callback) {
				return window.setTimeout(callback, 1000 / 60);
			}
		);
	})();

	var cancelAFrame = (function() {
		return (
			window.cancelAnimationFrame ||
			window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			window.oCancelAnimationFrame ||
			function(id) {
				window.clearTimeout(id);
			}
		);
	})();

	var getPointerXY = function(e) {
		var result = [];

		e = e.originalEvent || e || window.e;
		e = e.touches && e.touches.length ? e.touches : e.changedTouches && e.changedTouches.length ? e.changedTouches : [e];

		for (var key in e) {
			if (e[key].pageX) {
				result.push({
					x: e[key].pageX,
					y: e[key].pageY
				});
			} else if (e[key].clientX) {
				result.push({
					x: e[key].clientX,
					y: e[key].clientY
				});
			}
		}

		return result;
	};

	var distance = function(point2, point1, what) {
		if (!point1 || !point2) {
			return 0;
		}

		if (what === "x") {
			return point2.x - point1.x;
		} else if (what === "y") {
			return point2.y - point1.y;
		}

		return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
	};

	var isClickable = function($el) {
		if (
			$el.is('a,area,button,[role="button"],input,label,select,summary,textarea,video,audio,iframe') ||
			$.isFunction($el.get(0).onclick) ||
			$el.data("selectable")
		) {
			return true;
		}

		// Check for attributes like data-fancybox-next or data-fancybox-close
		for (var i = 0, atts = $el[0].attributes, n = atts.length; i < n; i++) {
			if (atts[i].nodeName.substr(0, 14) === "data-fancybox-") {
				return true;
			}
		}

		return false;
	};

	var hasScrollbars = function(el) {
		var overflowY = window.getComputedStyle(el)["overflow-y"],
			overflowX = window.getComputedStyle(el)["overflow-x"],
			vertical = (overflowY === "scroll" || overflowY === "auto") && el.scrollHeight > el.clientHeight,
			horizontal = (overflowX === "scroll" || overflowX === "auto") && el.scrollWidth > el.clientWidth;

		return vertical || horizontal;
	};

	var isScrollable = function($el) {
		var rez = false;

		while (true) {
			rez = hasScrollbars($el.get(0));

			if (rez) {
				break;
			}

			$el = $el.parent();

			if (!$el.length || $el.hasClass("fancybox-stage") || $el.is("body")) {
				break;
			}
		}

		return rez;
	};

	var Guestures = function(instance) {
		var self = this;

		self.instance = instance;

		self.$bg = instance.$refs.bg;
		self.$stage = instance.$refs.stage;
		self.$container = instance.$refs.container;

		self.destroy();

		self.$container.on("touchstart.fb.touch mousedown.fb.touch", $.proxy(self, "ontouchstart"));
	};

	Guestures.prototype.destroy = function() {
		var self = this;

		self.$container.off(".fb.touch");

		$(document).off(".fb.touch");

		if (self.requestId) {
			cancelAFrame(self.requestId);
			self.requestId = null;
		}

		if (self.tapped) {
			clearTimeout(self.tapped);
			self.tapped = null;
		}
	};

	Guestures.prototype.ontouchstart = function(e) {
		var self = this,
			$target = $(e.target),
			instance = self.instance,
			current = instance.current,
			$slide = current.$slide,
			$content = current.$content,
			isTouchDevice = e.type == "touchstart";

		// Do not respond to both (touch and mouse) events
		if (isTouchDevice) {
			self.$container.off("mousedown.fb.touch");
		}

		// Ignore right click
		if (e.originalEvent && e.originalEvent.button == 2) {
			return;
		}

		// Ignore taping on links, buttons, input elements
		if (!$slide.length || !$target.length || isClickable($target) || isClickable($target.parent())) {
			return;
		}
		// Ignore clicks on the scrollbar
		if (!$target.is("img") && e.originalEvent.clientX > $target[0].clientWidth + $target.offset().left) {
			return;
		}

		// Ignore clicks while zooming or closing
		if (!current || instance.isAnimating || current.$slide.hasClass("fancybox-animated")) {
			e.stopPropagation();
			e.preventDefault();

			return;
		}

		self.realPoints = self.startPoints = getPointerXY(e);

		if (!self.startPoints.length) {
			return;
		}

		// Allow other scripts to catch touch event if "touch" is set to false
		if (current.touch) {
			e.stopPropagation();
		}

		self.startEvent = e;

		self.canTap = true;
		self.$target = $target;
		self.$content = $content;
		self.opts = current.opts.touch;

		self.isPanning = false;
		self.isSwiping = false;
		self.isZooming = false;
		self.isScrolling = false;
		self.canPan = instance.canPan();

		self.startTime = new Date().getTime();
		self.distanceX = self.distanceY = self.distance = 0;

		self.canvasWidth = Math.round($slide[0].clientWidth);
		self.canvasHeight = Math.round($slide[0].clientHeight);

		self.contentLastPos = null;
		self.contentStartPos = $.fancybox.getTranslate(self.$content) || {top: 0, left: 0};
		self.sliderStartPos = $.fancybox.getTranslate($slide);

		// Since position will be absolute, but we need to make it relative to the stage
		self.stagePos = $.fancybox.getTranslate(instance.$refs.stage);

		self.sliderStartPos.top -= self.stagePos.top;
		self.sliderStartPos.left -= self.stagePos.left;

		self.contentStartPos.top -= self.stagePos.top;
		self.contentStartPos.left -= self.stagePos.left;

		$(document)
			.off(".fb.touch")
			.on(isTouchDevice ? "touchend.fb.touch touchcancel.fb.touch" : "mouseup.fb.touch mouseleave.fb.touch", $.proxy(self, "ontouchend"))
			.on(isTouchDevice ? "touchmove.fb.touch" : "mousemove.fb.touch", $.proxy(self, "ontouchmove"));

		if ($.fancybox.isMobile) {
			document.addEventListener("scroll", self.onscroll, true);
		}

		// Skip if clicked outside the sliding area
		if (!(self.opts || self.canPan) || !($target.is(self.$stage) || self.$stage.find($target).length)) {
			if ($target.is(".fancybox-image")) {
				e.preventDefault();
			}

			if (!($.fancybox.isMobile && $target.hasClass("fancybox-caption"))) {
				return;
			}
		}

		self.isScrollable = isScrollable($target) || isScrollable($target.parent());

		// Check if element is scrollable and try to prevent default behavior (scrolling)
		if (!($.fancybox.isMobile && self.isScrollable)) {
			e.preventDefault();
		}

		// One finger or mouse click - swipe or pan an image
		if (self.startPoints.length === 1 || current.hasError) {
			if (self.canPan) {
				$.fancybox.stop(self.$content);

				self.isPanning = true;
			} else {
				self.isSwiping = true;
			}

			self.$container.addClass("fancybox-is-grabbing");
		}

		// Two fingers - zoom image
		if (self.startPoints.length === 2 && current.type === "image" && (current.isLoaded || current.$ghost)) {
			self.canTap = false;
			self.isSwiping = false;
			self.isPanning = false;

			self.isZooming = true;

			$.fancybox.stop(self.$content);

			self.centerPointStartX = (self.startPoints[0].x + self.startPoints[1].x) * 0.5 - $(window).scrollLeft();
			self.centerPointStartY = (self.startPoints[0].y + self.startPoints[1].y) * 0.5 - $(window).scrollTop();

			self.percentageOfImageAtPinchPointX = (self.centerPointStartX - self.contentStartPos.left) / self.contentStartPos.width;
			self.percentageOfImageAtPinchPointY = (self.centerPointStartY - self.contentStartPos.top) / self.contentStartPos.height;

			self.startDistanceBetweenFingers = distance(self.startPoints[0], self.startPoints[1]);
		}
	};

	Guestures.prototype.onscroll = function(e) {
		var self = this;

		self.isScrolling = true;

		document.removeEventListener("scroll", self.onscroll, true);
	};

	Guestures.prototype.ontouchmove = function(e) {
		var self = this;

		// Make sure user has not released over iframe or disabled element
		if (e.originalEvent.buttons !== undefined && e.originalEvent.buttons === 0) {
			self.ontouchend(e);
			return;
		}

		if (self.isScrolling) {
			self.canTap = false;
			return;
		}

		self.newPoints = getPointerXY(e);

		if (!(self.opts || self.canPan) || !self.newPoints.length || !self.newPoints.length) {
			return;
		}

		if (!(self.isSwiping && self.isSwiping === true)) {
			e.preventDefault();
		}

		self.distanceX = distance(self.newPoints[0], self.startPoints[0], "x");
		self.distanceY = distance(self.newPoints[0], self.startPoints[0], "y");

		self.distance = distance(self.newPoints[0], self.startPoints[0]);

		// Skip false ontouchmove events (Chrome)
		if (self.distance > 0) {
			if (self.isSwiping) {
				self.onSwipe(e);
			} else if (self.isPanning) {
				self.onPan();
			} else if (self.isZooming) {
				self.onZoom();
			}
		}
	};

	Guestures.prototype.onSwipe = function(e) {
		var self = this,
			instance = self.instance,
			swiping = self.isSwiping,
			left = self.sliderStartPos.left || 0,
			angle;

		// If direction is not yet determined
		if (swiping === true) {
			// We need at least 10px distance to correctly calculate an angle
			if (Math.abs(self.distance) > 10) {
				self.canTap = false;

				if (instance.group.length < 2 && self.opts.vertical) {
					self.isSwiping = "y";
				} else if (instance.isDragging || self.opts.vertical === false || (self.opts.vertical === "auto" && $(window).width() > 800)) {
					self.isSwiping = "x";
				} else {
					angle = Math.abs((Math.atan2(self.distanceY, self.distanceX) * 180) / Math.PI);

					self.isSwiping = angle > 45 && angle < 135 ? "y" : "x";
				}

				if (self.isSwiping === "y" && $.fancybox.isMobile && self.isScrollable) {
					self.isScrolling = true;

					return;
				}

				instance.isDragging = self.isSwiping;

				// Reset points to avoid jumping, because we dropped first swipes to calculate the angle
				self.startPoints = self.newPoints;

				$.each(instance.slides, function(index, slide) {
					var slidePos, stagePos;

					$.fancybox.stop(slide.$slide);

					slidePos = $.fancybox.getTranslate(slide.$slide);
					stagePos = $.fancybox.getTranslate(instance.$refs.stage);

					slide.$slide
						.css({
							transform: "",
							opacity: "",
							"transition-duration": ""
						})
						.removeClass("fancybox-animated")
						.removeClass(function(index, className) {
							return (className.match(/(^|\s)fancybox-fx-\S+/g) || []).join(" ");
						});

					if (slide.pos === instance.current.pos) {
						self.sliderStartPos.top = slidePos.top - stagePos.top;
						self.sliderStartPos.left = slidePos.left - stagePos.left;
					}

					$.fancybox.setTranslate(slide.$slide, {
						top: slidePos.top - stagePos.top,
						left: slidePos.left - stagePos.left
					});
				});

				// Stop slideshow
				if (instance.SlideShow && instance.SlideShow.isActive) {
					instance.SlideShow.stop();
				}
			}

			return;
		}

		// Sticky edges
		if (swiping == "x") {
			if (
				self.distanceX > 0 &&
				(self.instance.group.length < 2 || (self.instance.current.index === 0 && !self.instance.current.opts.loop))
			) {
				left = left + Math.pow(self.distanceX, 0.8);
			} else if (
				self.distanceX < 0 &&
				(self.instance.group.length < 2 ||
					(self.instance.current.index === self.instance.group.length - 1 && !self.instance.current.opts.loop))
			) {
				left = left - Math.pow(-self.distanceX, 0.8);
			} else {
				left = left + self.distanceX;
			}
		}

		self.sliderLastPos = {
			top: swiping == "x" ? 0 : self.sliderStartPos.top + self.distanceY,
			left: left
		};

		if (self.requestId) {
			cancelAFrame(self.requestId);

			self.requestId = null;
		}

		self.requestId = requestAFrame(function() {
			if (self.sliderLastPos) {
				$.each(self.instance.slides, function(index, slide) {
					var pos = slide.pos - self.instance.currPos;

					$.fancybox.setTranslate(slide.$slide, {
						top: self.sliderLastPos.top,
						left: self.sliderLastPos.left + pos * self.canvasWidth + pos * slide.opts.gutter
					});
				});

				self.$container.addClass("fancybox-is-sliding");
			}
		});
	};

	Guestures.prototype.onPan = function() {
		var self = this;

		// Prevent accidental movement (sometimes, when tapping casually, finger can move a bit)
		if (distance(self.newPoints[0], self.realPoints[0]) < ($.fancybox.isMobile ? 10 : 5)) {
			self.startPoints = self.newPoints;
			return;
		}

		self.canTap = false;

		self.contentLastPos = self.limitMovement();

		if (self.requestId) {
			cancelAFrame(self.requestId);
		}

		self.requestId = requestAFrame(function() {
			$.fancybox.setTranslate(self.$content, self.contentLastPos);
		});
	};

	// Make panning sticky to the edges
	Guestures.prototype.limitMovement = function() {
		var self = this;

		var canvasWidth = self.canvasWidth;
		var canvasHeight = self.canvasHeight;

		var distanceX = self.distanceX;
		var distanceY = self.distanceY;

		var contentStartPos = self.contentStartPos;

		var currentOffsetX = contentStartPos.left;
		var currentOffsetY = contentStartPos.top;

		var currentWidth = contentStartPos.width;
		var currentHeight = contentStartPos.height;

		var minTranslateX, minTranslateY, maxTranslateX, maxTranslateY, newOffsetX, newOffsetY;

		if (currentWidth > canvasWidth) {
			newOffsetX = currentOffsetX + distanceX;
		} else {
			newOffsetX = currentOffsetX;
		}

		newOffsetY = currentOffsetY + distanceY;

		// Slow down proportionally to traveled distance
		minTranslateX = Math.max(0, canvasWidth * 0.5 - currentWidth * 0.5);
		minTranslateY = Math.max(0, canvasHeight * 0.5 - currentHeight * 0.5);

		maxTranslateX = Math.min(canvasWidth - currentWidth, canvasWidth * 0.5 - currentWidth * 0.5);
		maxTranslateY = Math.min(canvasHeight - currentHeight, canvasHeight * 0.5 - currentHeight * 0.5);

		//   ->
		if (distanceX > 0 && newOffsetX > minTranslateX) {
			newOffsetX = minTranslateX - 1 + Math.pow(-minTranslateX + currentOffsetX + distanceX, 0.8) || 0;
		}

		//    <-
		if (distanceX < 0 && newOffsetX < maxTranslateX) {
			newOffsetX = maxTranslateX + 1 - Math.pow(maxTranslateX - currentOffsetX - distanceX, 0.8) || 0;
		}

		//   \/
		if (distanceY > 0 && newOffsetY > minTranslateY) {
			newOffsetY = minTranslateY - 1 + Math.pow(-minTranslateY + currentOffsetY + distanceY, 0.8) || 0;
		}

		//   /\
		if (distanceY < 0 && newOffsetY < maxTranslateY) {
			newOffsetY = maxTranslateY + 1 - Math.pow(maxTranslateY - currentOffsetY - distanceY, 0.8) || 0;
		}

		return {
			top: newOffsetY,
			left: newOffsetX
		};
	};

	Guestures.prototype.limitPosition = function(newOffsetX, newOffsetY, newWidth, newHeight) {
		var self = this;

		var canvasWidth = self.canvasWidth;
		var canvasHeight = self.canvasHeight;

		if (newWidth > canvasWidth) {
			newOffsetX = newOffsetX > 0 ? 0 : newOffsetX;
			newOffsetX = newOffsetX < canvasWidth - newWidth ? canvasWidth - newWidth : newOffsetX;
		} else {
			// Center horizontally
			newOffsetX = Math.max(0, canvasWidth / 2 - newWidth / 2);
		}

		if (newHeight > canvasHeight) {
			newOffsetY = newOffsetY > 0 ? 0 : newOffsetY;
			newOffsetY = newOffsetY < canvasHeight - newHeight ? canvasHeight - newHeight : newOffsetY;
		} else {
			// Center vertically
			newOffsetY = Math.max(0, canvasHeight / 2 - newHeight / 2);
		}

		return {
			top: newOffsetY,
			left: newOffsetX
		};
	};

	Guestures.prototype.onZoom = function() {
		var self = this;

		// Calculate current distance between points to get pinch ratio and new width and height
		var contentStartPos = self.contentStartPos;

		var currentWidth = contentStartPos.width;
		var currentHeight = contentStartPos.height;

		var currentOffsetX = contentStartPos.left;
		var currentOffsetY = contentStartPos.top;

		var endDistanceBetweenFingers = distance(self.newPoints[0], self.newPoints[1]);

		var pinchRatio = endDistanceBetweenFingers / self.startDistanceBetweenFingers;

		var newWidth = Math.floor(currentWidth * pinchRatio);
		var newHeight = Math.floor(currentHeight * pinchRatio);

		// This is the translation due to pinch-zooming
		var translateFromZoomingX = (currentWidth - newWidth) * self.percentageOfImageAtPinchPointX;
		var translateFromZoomingY = (currentHeight - newHeight) * self.percentageOfImageAtPinchPointY;

		// Point between the two touches
		var centerPointEndX = (self.newPoints[0].x + self.newPoints[1].x) / 2 - $(window).scrollLeft();
		var centerPointEndY = (self.newPoints[0].y + self.newPoints[1].y) / 2 - $(window).scrollTop();

		// And this is the translation due to translation of the centerpoint
		// between the two fingers
		var translateFromTranslatingX = centerPointEndX - self.centerPointStartX;
		var translateFromTranslatingY = centerPointEndY - self.centerPointStartY;

		// The new offset is the old/current one plus the total translation
		var newOffsetX = currentOffsetX + (translateFromZoomingX + translateFromTranslatingX);
		var newOffsetY = currentOffsetY + (translateFromZoomingY + translateFromTranslatingY);

		var newPos = {
			top: newOffsetY,
			left: newOffsetX,
			scaleX: pinchRatio,
			scaleY: pinchRatio
		};

		self.canTap = false;

		self.newWidth = newWidth;
		self.newHeight = newHeight;

		self.contentLastPos = newPos;

		if (self.requestId) {
			cancelAFrame(self.requestId);
		}

		self.requestId = requestAFrame(function() {
			$.fancybox.setTranslate(self.$content, self.contentLastPos);
		});
	};

	Guestures.prototype.ontouchend = function(e) {
		var self = this;

		var swiping = self.isSwiping;
		var panning = self.isPanning;
		var zooming = self.isZooming;
		var scrolling = self.isScrolling;

		self.endPoints = getPointerXY(e);
		self.dMs = Math.max(new Date().getTime() - self.startTime, 1);

		self.$container.removeClass("fancybox-is-grabbing");

		$(document).off(".fb.touch");

		document.removeEventListener("scroll", self.onscroll, true);

		if (self.requestId) {
			cancelAFrame(self.requestId);

			self.requestId = null;
		}

		self.isSwiping = false;
		self.isPanning = false;
		self.isZooming = false;
		self.isScrolling = false;

		self.instance.isDragging = false;

		if (self.canTap) {
			return self.onTap(e);
		}

		self.speed = 100;

		// Speed in px/ms
		self.velocityX = (self.distanceX / self.dMs) * 0.5;
		self.velocityY = (self.distanceY / self.dMs) * 0.5;

		if (panning) {
			self.endPanning();
		} else if (zooming) {
			self.endZooming();
		} else {
			self.endSwiping(swiping, scrolling);
		}

		return;
	};

	Guestures.prototype.endSwiping = function(swiping, scrolling) {
		var self = this,
			ret = false,
			len = self.instance.group.length,
			distanceX = Math.abs(self.distanceX),
			canAdvance = swiping == "x" && len > 1 && ((self.dMs > 130 && distanceX > 10) || distanceX > 50),
			speedX = 300;

		self.sliderLastPos = null;

		// Close if swiped vertically / navigate if horizontally
		if (swiping == "y" && !scrolling && Math.abs(self.distanceY) > 50) {
			// Continue vertical movement
			$.fancybox.animate(
				self.instance.current.$slide,
				{
					top: self.sliderStartPos.top + self.distanceY + self.velocityY * 150,
					opacity: 0
				},
				200
			);
			ret = self.instance.close(true, 250);
		} else if (canAdvance && self.distanceX > 0) {
			ret = self.instance.previous(speedX);
		} else if (canAdvance && self.distanceX < 0) {
			ret = self.instance.next(speedX);
		}

		if (ret === false && (swiping == "x" || swiping == "y")) {
			self.instance.centerSlide(200);
		}

		self.$container.removeClass("fancybox-is-sliding");
	};

	// Limit panning from edges
	// ========================
	Guestures.prototype.endPanning = function() {
		var self = this,
			newOffsetX,
			newOffsetY,
			newPos;

		if (!self.contentLastPos) {
			return;
		}

		if (self.opts.momentum === false || self.dMs > 350) {
			newOffsetX = self.contentLastPos.left;
			newOffsetY = self.contentLastPos.top;
		} else {
			// Continue movement
			newOffsetX = self.contentLastPos.left + self.velocityX * 500;
			newOffsetY = self.contentLastPos.top + self.velocityY * 500;
		}

		newPos = self.limitPosition(newOffsetX, newOffsetY, self.contentStartPos.width, self.contentStartPos.height);

		newPos.width = self.contentStartPos.width;
		newPos.height = self.contentStartPos.height;

		$.fancybox.animate(self.$content, newPos, 330);
	};

	Guestures.prototype.endZooming = function() {
		var self = this;

		var current = self.instance.current;

		var newOffsetX, newOffsetY, newPos, reset;

		var newWidth = self.newWidth;
		var newHeight = self.newHeight;

		if (!self.contentLastPos) {
			return;
		}

		newOffsetX = self.contentLastPos.left;
		newOffsetY = self.contentLastPos.top;

		reset = {
			top: newOffsetY,
			left: newOffsetX,
			width: newWidth,
			height: newHeight,
			scaleX: 1,
			scaleY: 1
		};

		// Reset scalex/scaleY values; this helps for perfomance and does not break animation
		$.fancybox.setTranslate(self.$content, reset);

		if (newWidth < self.canvasWidth && newHeight < self.canvasHeight) {
			self.instance.scaleToFit(150);
		} else if (newWidth > current.width || newHeight > current.height) {
			self.instance.scaleToActual(self.centerPointStartX, self.centerPointStartY, 150);
		} else {
			newPos = self.limitPosition(newOffsetX, newOffsetY, newWidth, newHeight);

			$.fancybox.animate(self.$content, newPos, 150);
		}
	};

	Guestures.prototype.onTap = function(e) {
		var self = this;
		var $target = $(e.target);

		var instance = self.instance;
		var current = instance.current;

		var endPoints = (e && getPointerXY(e)) || self.startPoints;

		var tapX = endPoints[0] ? endPoints[0].x - $(window).scrollLeft() - self.stagePos.left : 0;
		var tapY = endPoints[0] ? endPoints[0].y - $(window).scrollTop() - self.stagePos.top : 0;

		var where;

		var process = function(prefix) {
			var action = current.opts[prefix];

			if ($.isFunction(action)) {
				action = action.apply(instance, [current, e]);
			}

			if (!action) {
				return;
			}

			switch (action) {
				case "close":
					instance.close(self.startEvent);

					break;

				case "toggleControls":
					instance.toggleControls();

					break;

				case "next":
					instance.next();

					break;

				case "nextOrClose":
					if (instance.group.length > 1) {
						instance.next();
					} else {
						instance.close(self.startEvent);
					}

					break;

				case "zoom":
					if (current.type == "image" && (current.isLoaded || current.$ghost)) {
						if (instance.canPan()) {
							instance.scaleToFit();
						} else if (instance.isScaledDown()) {
							instance.scaleToActual(tapX, tapY);
						} else if (instance.group.length < 2) {
							instance.close(self.startEvent);
						}
					}

					break;
			}
		};

		// Ignore right click
		if (e.originalEvent && e.originalEvent.button == 2) {
			return;
		}

		// Skip if clicked on the scrollbar
		if (!$target.is("img") && tapX > $target[0].clientWidth + $target.offset().left) {
			return;
		}

		// Check where is clicked
		if ($target.is(".fancybox-bg,.fancybox-inner,.fancybox-outer,.fancybox-container")) {
			where = "Outside";
		} else if ($target.is(".fancybox-slide")) {
			where = "Slide";
		} else if (
			instance.current.$content &&
			instance.current.$content
				.find($target)
				.addBack()
				.filter($target).length
		) {
			where = "Content";
		} else {
			return;
		}

		// Check if this is a double tap
		if (self.tapped) {
			// Stop previously created single tap
			clearTimeout(self.tapped);
			self.tapped = null;

			// Skip if distance between taps is too big
			if (Math.abs(tapX - self.tapX) > 50 || Math.abs(tapY - self.tapY) > 50) {
				return this;
			}

			// OK, now we assume that this is a double-tap
			process("dblclick" + where);
		} else {
			// Single tap will be processed if user has not clicked second time within 300ms
			// or there is no need to wait for double-tap
			self.tapX = tapX;
			self.tapY = tapY;

			if (current.opts["dblclick" + where] && current.opts["dblclick" + where] !== current.opts["click" + where]) {
				self.tapped = setTimeout(function() {
					self.tapped = null;

					if (!instance.isAnimating) {
						process("click" + where);
					}
				}, 500);
			} else {
				process("click" + where);
			}
		}

		return this;
	};

	$(document)
		.on("onActivate.fb", function(e, instance) {
			if (instance && !instance.Guestures) {
				instance.Guestures = new Guestures(instance);
			}
		})
		.on("beforeClose.fb", function(e, instance) {
			if (instance && instance.Guestures) {
				instance.Guestures.destroy();
			}
		});
})(window, document, jQuery);

// ==========================================================================
//
// SlideShow
// Enables slideshow functionality
//
// Example of usage:
// $.fancybox.getInstance().SlideShow.start()
//
// ==========================================================================
(function(document, $) {
	"use strict";

	$.extend(true, $.fancybox.defaults, {
		btnTpl: {
			slideShow:
				'<button data-fancybox-play class="fancybox-button fancybox-button--play" title="{{PLAY_START}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6.5 5.4v13.2l11-6.6z"/></svg>' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.33 5.75h2.2v12.5h-2.2V5.75zm5.15 0h2.2v12.5h-2.2V5.75z"/></svg>' +
				"</button>"
		},
		slideShow: {
			autoStart: false,
			speed: 3000,
			progress: true
		}
	});

	var SlideShow = function(instance) {
		this.instance = instance;
		this.init();
	};

	$.extend(SlideShow.prototype, {
		timer: null,
		isActive: false,
		$button: null,

		init: function() {
			var self = this,
				instance = self.instance,
				opts = instance.group[instance.currIndex].opts.slideShow;

			self.$button = instance.$refs.toolbar.find("[data-fancybox-play]").on("click", function() {
				self.toggle();
			});

			if (instance.group.length < 2 || !opts) {
				self.$button.hide();
			} else if (opts.progress) {
				self.$progress = $('<div class="fancybox-progress"></div>').appendTo(instance.$refs.inner);
			}
		},

		set: function(force) {
			var self = this,
				instance = self.instance,
				current = instance.current;

			// Check if reached last element
			if (current && (force === true || current.opts.loop || instance.currIndex < instance.group.length - 1)) {
				if (self.isActive && current.contentType !== "video") {
					if (self.$progress) {
						$.fancybox.animate(self.$progress.show(), {scaleX: 1}, current.opts.slideShow.speed);
					}

					self.timer = setTimeout(function() {
						if (!instance.current.opts.loop && instance.current.index == instance.group.length - 1) {
							instance.jumpTo(0);
						} else {
							instance.next();
						}
					}, current.opts.slideShow.speed);
				}
			} else {
				self.stop();
				instance.idleSecondsCounter = 0;
				instance.showControls();
			}
		},

		clear: function() {
			var self = this;

			clearTimeout(self.timer);

			self.timer = null;

			if (self.$progress) {
				self.$progress.removeAttr("style").hide();
			}
		},

		start: function() {
			var self = this,
				current = self.instance.current;

			if (current) {
				self.$button
					.attr("title", (current.opts.i18n[current.opts.lang] || current.opts.i18n.en).PLAY_STOP)
					.removeClass("fancybox-button--play")
					.addClass("fancybox-button--pause");

				self.isActive = true;

				if (current.isComplete) {
					self.set(true);
				}

				self.instance.trigger("onSlideShowChange", true);
			}
		},

		stop: function() {
			var self = this,
				current = self.instance.current;

			self.clear();

			self.$button
				.attr("title", (current.opts.i18n[current.opts.lang] || current.opts.i18n.en).PLAY_START)
				.removeClass("fancybox-button--pause")
				.addClass("fancybox-button--play");

			self.isActive = false;

			self.instance.trigger("onSlideShowChange", false);

			if (self.$progress) {
				self.$progress.removeAttr("style").hide();
			}
		},

		toggle: function() {
			var self = this;

			if (self.isActive) {
				self.stop();
			} else {
				self.start();
			}
		}
	});

	$(document).on({
		"onInit.fb": function(e, instance) {
			if (instance && !instance.SlideShow) {
				instance.SlideShow = new SlideShow(instance);
			}
		},

		"beforeShow.fb": function(e, instance, current, firstRun) {
			var SlideShow = instance && instance.SlideShow;

			if (firstRun) {
				if (SlideShow && current.opts.slideShow.autoStart) {
					SlideShow.start();
				}
			} else if (SlideShow && SlideShow.isActive) {
				SlideShow.clear();
			}
		},

		"afterShow.fb": function(e, instance, current) {
			var SlideShow = instance && instance.SlideShow;

			if (SlideShow && SlideShow.isActive) {
				SlideShow.set();
			}
		},

		"afterKeydown.fb": function(e, instance, current, keypress, keycode) {
			var SlideShow = instance && instance.SlideShow;

			// "P" or Spacebar
			if (SlideShow && current.opts.slideShow && (keycode === 80 || keycode === 32) && !$(document.activeElement).is("button,a,input")) {
				keypress.preventDefault();

				SlideShow.toggle();
			}
		},

		"beforeClose.fb onDeactivate.fb": function(e, instance) {
			var SlideShow = instance && instance.SlideShow;

			if (SlideShow) {
				SlideShow.stop();
			}
		}
	});

	// Page Visibility API to pause slideshow when window is not active
	$(document).on("visibilitychange", function() {
		var instance = $.fancybox.getInstance(),
			SlideShow = instance && instance.SlideShow;

		if (SlideShow && SlideShow.isActive) {
			if (document.hidden) {
				SlideShow.clear();
			} else {
				SlideShow.set();
			}
		}
	});
})(document, jQuery);

// ==========================================================================
//
// FullScreen
// Adds fullscreen functionality
//
// ==========================================================================
(function(document, $) {
	"use strict";

	// Collection of methods supported by user browser
	var fn = (function() {
		var fnMap = [
			["requestFullscreen", "exitFullscreen", "fullscreenElement", "fullscreenEnabled", "fullscreenchange", "fullscreenerror"],
			// new WebKit
			[
				"webkitRequestFullscreen",
				"webkitExitFullscreen",
				"webkitFullscreenElement",
				"webkitFullscreenEnabled",
				"webkitfullscreenchange",
				"webkitfullscreenerror"
			],
			// old WebKit (Safari 5.1)
			[
				"webkitRequestFullScreen",
				"webkitCancelFullScreen",
				"webkitCurrentFullScreenElement",
				"webkitCancelFullScreen",
				"webkitfullscreenchange",
				"webkitfullscreenerror"
			],
			[
				"mozRequestFullScreen",
				"mozCancelFullScreen",
				"mozFullScreenElement",
				"mozFullScreenEnabled",
				"mozfullscreenchange",
				"mozfullscreenerror"
			],
			["msRequestFullscreen", "msExitFullscreen", "msFullscreenElement", "msFullscreenEnabled", "MSFullscreenChange", "MSFullscreenError"]
		];

		var ret = {};

		for (var i = 0; i < fnMap.length; i++) {
			var val = fnMap[i];

			if (val && val[1] in document) {
				for (var j = 0; j < val.length; j++) {
					ret[fnMap[0][j]] = val[j];
				}

				return ret;
			}
		}

		return false;
	})();

	if (fn) {
		var FullScreen = {
			request: function(elem) {
				elem = elem || document.documentElement;

				elem[fn.requestFullscreen](elem.ALLOW_KEYBOARD_INPUT);
			},
			exit: function() {
				document[fn.exitFullscreen]();
			},
			toggle: function(elem) {
				elem = elem || document.documentElement;

				if (this.isFullscreen()) {
					this.exit();
				} else {
					this.request(elem);
				}
			},
			isFullscreen: function() {
				return Boolean(document[fn.fullscreenElement]);
			},
			enabled: function() {
				return Boolean(document[fn.fullscreenEnabled]);
			}
		};

		$.extend(true, $.fancybox.defaults, {
			btnTpl: {
				fullScreen:
					'<button data-fancybox-fullscreen class="fancybox-button fancybox-button--fsenter" title="{{FULL_SCREEN}}">' +
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>' +
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z"/></svg>' +
					"</button>"
			},
			fullScreen: {
				autoStart: false
			}
		});

		$(document).on(fn.fullscreenchange, function() {
			var isFullscreen = FullScreen.isFullscreen(),
				instance = $.fancybox.getInstance();

			if (instance) {
				// If image is zooming, then force to stop and reposition properly
				if (instance.current && instance.current.type === "image" && instance.isAnimating) {
					instance.current.$content.css("transition", "none");

					instance.isAnimating = false;

					instance.update(true, true, 0);
				}

				instance.trigger("onFullscreenChange", isFullscreen);

				instance.$refs.container.toggleClass("fancybox-is-fullscreen", isFullscreen);

				instance.$refs.toolbar
					.find("[data-fancybox-fullscreen]")
					.toggleClass("fancybox-button--fsenter", !isFullscreen)
					.toggleClass("fancybox-button--fsexit", isFullscreen);
			}
		});
	}

	$(document).on({
		"onInit.fb": function(e, instance) {
			var $container;

			if (!fn) {
				instance.$refs.toolbar.find("[data-fancybox-fullscreen]").remove();

				return;
			}

			if (instance && instance.group[instance.currIndex].opts.fullScreen) {
				$container = instance.$refs.container;

				$container.on("click.fb-fullscreen", "[data-fancybox-fullscreen]", function(e) {
					e.stopPropagation();
					e.preventDefault();

					FullScreen.toggle();
				});

				if (instance.opts.fullScreen && instance.opts.fullScreen.autoStart === true) {
					FullScreen.request();
				}

				// Expose API
				instance.FullScreen = FullScreen;
			} else if (instance) {
				instance.$refs.toolbar.find("[data-fancybox-fullscreen]").hide();
			}
		},

		"afterKeydown.fb": function(e, instance, current, keypress, keycode) {
			// "F"
			if (instance && instance.FullScreen && keycode === 70) {
				keypress.preventDefault();

				instance.FullScreen.toggle();
			}
		},

		"beforeClose.fb": function(e, instance) {
			if (instance && instance.FullScreen && instance.$refs.container.hasClass("fancybox-is-fullscreen")) {
				FullScreen.exit();
			}
		}
	});
})(document, jQuery);

// ==========================================================================
//
// Thumbs
// Displays thumbnails in a grid
//
// ==========================================================================
(function(document, $) {
	"use strict";

	var CLASS = "fancybox-thumbs",
		CLASS_ACTIVE = CLASS + "-active";

	// Make sure there are default values
	$.fancybox.defaults = $.extend(
		true,
		{
			btnTpl: {
				thumbs:
					'<button data-fancybox-thumbs class="fancybox-button fancybox-button--thumbs" title="{{THUMBS}}">' +
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.59 14.59h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76H5.65V5.65z"/></svg>' +
					"</button>"
			},
			thumbs: {
				autoStart: false, // Display thumbnails on opening
				hideOnClose: true, // Hide thumbnail grid when closing animation starts
				parentEl: ".fancybox-container", // Container is injected into this element
				axis: "y" // Vertical (y) or horizontal (x) scrolling
			}
		},
		$.fancybox.defaults
	);

	var FancyThumbs = function(instance) {
		this.init(instance);
	};

	$.extend(FancyThumbs.prototype, {
		$button: null,
		$grid: null,
		$list: null,
		isVisible: false,
		isActive: false,

		init: function(instance) {
			var self = this,
				group = instance.group,
				enabled = 0;

			self.instance = instance;
			self.opts = group[instance.currIndex].opts.thumbs;

			instance.Thumbs = self;

			self.$button = instance.$refs.toolbar.find("[data-fancybox-thumbs]");

			// Enable thumbs if at least two group items have thumbnails
			for (var i = 0, len = group.length; i < len; i++) {
				if (group[i].thumb) {
					enabled++;
				}

				if (enabled > 1) {
					break;
				}
			}

			if (enabled > 1 && !!self.opts) {
				self.$button.removeAttr("style").on("click", function() {
					self.toggle();
				});

				self.isActive = true;
			} else {
				self.$button.hide();
			}
		},

		create: function() {
			var self = this,
				instance = self.instance,
				parentEl = self.opts.parentEl,
				list = [],
				src;

			if (!self.$grid) {
				// Create main element
				self.$grid = $('<div class="' + CLASS + " " + CLASS + "-" + self.opts.axis + '"></div>').appendTo(
					instance.$refs.container
						.find(parentEl)
						.addBack()
						.filter(parentEl)
				);

				// Add "click" event that performs gallery navigation
				self.$grid.on("click", "a", function() {
					instance.jumpTo($(this).attr("data-index"));
				});
			}

			// Build the list
			if (!self.$list) {
				self.$list = $('<div class="' + CLASS + '__list">').appendTo(self.$grid);
			}

			$.each(instance.group, function(i, item) {
				src = item.thumb;

				if (!src && item.type === "image") {
					src = item.src;
				}

				list.push(
					'<a href="javascript:;" tabindex="0" data-index="' +
					i +
					'"' +
					(src && src.length ? ' style="background-image:url(' + src + ')"' : 'class="fancybox-thumbs-missing"') +
					"></a>"
				);
			});

			self.$list[0].innerHTML = list.join("");

			if (self.opts.axis === "x") {
				// Set fixed width for list element to enable horizontal scrolling
				self.$list.width(
					parseInt(self.$grid.css("padding-right"), 10) +
					instance.group.length *
					self.$list
						.children()
						.eq(0)
						.outerWidth(true)
				);
			}
		},

		focus: function(duration) {
			var self = this,
				$list = self.$list,
				$grid = self.$grid,
				thumb,
				thumbPos;

			if (!self.instance.current) {
				return;
			}

			thumb = $list
				.children()
				.removeClass(CLASS_ACTIVE)
				.filter('[data-index="' + self.instance.current.index + '"]')
				.addClass(CLASS_ACTIVE);

			thumbPos = thumb.position();

			// Check if need to scroll to make current thumb visible
			if (self.opts.axis === "y" && (thumbPos.top < 0 || thumbPos.top > $list.height() - thumb.outerHeight())) {
				$list.stop().animate(
					{
						scrollTop: $list.scrollTop() + thumbPos.top
					},
					duration
				);
			} else if (
				self.opts.axis === "x" &&
				(thumbPos.left < $grid.scrollLeft() || thumbPos.left > $grid.scrollLeft() + ($grid.width() - thumb.outerWidth()))
			) {
				$list
					.parent()
					.stop()
					.animate(
						{
							scrollLeft: thumbPos.left
						},
						duration
					);
			}
		},

		update: function() {
			var that = this;
			that.instance.$refs.container.toggleClass("fancybox-show-thumbs", this.isVisible);

			if (that.isVisible) {
				if (!that.$grid) {
					that.create();
				}

				that.instance.trigger("onThumbsShow");

				that.focus(0);
			} else if (that.$grid) {
				that.instance.trigger("onThumbsHide");
			}

			// Update content position
			that.instance.update();
		},

		hide: function() {
			this.isVisible = false;
			this.update();
		},

		show: function() {
			this.isVisible = true;
			this.update();
		},

		toggle: function() {
			this.isVisible = !this.isVisible;
			this.update();
		}
	});

	$(document).on({
		"onInit.fb": function(e, instance) {
			var Thumbs;

			if (instance && !instance.Thumbs) {
				Thumbs = new FancyThumbs(instance);

				if (Thumbs.isActive && Thumbs.opts.autoStart === true) {
					Thumbs.show();
				}
			}
		},

		"beforeShow.fb": function(e, instance, item, firstRun) {
			var Thumbs = instance && instance.Thumbs;

			if (Thumbs && Thumbs.isVisible) {
				Thumbs.focus(firstRun ? 0 : 250);
			}
		},

		"afterKeydown.fb": function(e, instance, current, keypress, keycode) {
			var Thumbs = instance && instance.Thumbs;

			// "G"
			if (Thumbs && Thumbs.isActive && keycode === 71) {
				keypress.preventDefault();

				Thumbs.toggle();
			}
		},

		"beforeClose.fb": function(e, instance) {
			var Thumbs = instance && instance.Thumbs;

			if (Thumbs && Thumbs.isVisible && Thumbs.opts.hideOnClose !== false) {
				Thumbs.$grid.hide();
			}
		}
	});
})(document, jQuery);

//// ==========================================================================
//
// Share
// Displays simple form for sharing current url
//
// ==========================================================================
(function(document, $) {
	"use strict";

	$.extend(true, $.fancybox.defaults, {
		btnTpl: {
			share:
				'<button data-fancybox-share class="fancybox-button fancybox-button--share" title="{{SHARE}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2.55 19c1.4-8.4 9.1-9.8 11.9-9.8V5l7 7-7 6.3v-3.5c-2.8 0-10.5 2.1-11.9 4.2z"/></svg>' +
				"</button>"
		},
		share: {
			url: function(instance, item) {
				return (
					(!instance.currentHash && !(item.type === "inline" || item.type === "html") ? item.origSrc || item.src : false) || window.location
				);
			},
			tpl:
				'<div class="fancybox-share">' +
				"<h1>{{SHARE}}</h1>" +
				"<p>" +
				'<a class="fancybox-share__button fancybox-share__button--fb" href="https://www.facebook.com/sharer/sharer.php?u={{url}}">' +
				'<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m287 456v-299c0-21 6-35 35-35h38v-63c-7-1-29-3-55-3-54 0-91 33-91 94v306m143-254h-205v72h196" /></svg>' +
				"<span>Facebook</span>" +
				"</a>" +
				'<a class="fancybox-share__button fancybox-share__button--tw" href="https://twitter.com/intent/tweet?url={{url}}&text={{descr}}">' +
				'<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m456 133c-14 7-31 11-47 13 17-10 30-27 37-46-15 10-34 16-52 20-61-62-157-7-141 75-68-3-129-35-169-85-22 37-11 86 26 109-13 0-26-4-37-9 0 39 28 72 65 80-12 3-25 4-37 2 10 33 41 57 77 57-42 30-77 38-122 34 170 111 378-32 359-208 16-11 30-25 41-42z" /></svg>' +
				"<span>Twitter</span>" +
				"</a>" +
				'<a class="fancybox-share__button fancybox-share__button--pt" href="https://www.pinterest.com/pin/create/button/?url={{url}}&description={{descr}}&media={{media}}">' +
				'<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m265 56c-109 0-164 78-164 144 0 39 15 74 47 87 5 2 10 0 12-5l4-19c2-6 1-8-3-13-9-11-15-25-15-45 0-58 43-110 113-110 62 0 96 38 96 88 0 67-30 122-73 122-24 0-42-19-36-44 6-29 20-60 20-81 0-19-10-35-31-35-25 0-44 26-44 60 0 21 7 36 7 36l-30 125c-8 37-1 83 0 87 0 3 4 4 5 2 2-3 32-39 42-75l16-64c8 16 31 29 56 29 74 0 124-67 124-157 0-69-58-132-146-132z" fill="#fff"/></svg>' +
				"<span>Pinterest</span>" +
				"</a>" +
				"</p>" +
				'<p><input class="fancybox-share__input" type="text" value="{{url_raw}}" onclick="select()" /></p>' +
				"</div>"
		}
	});

	function escapeHtml(string) {
		var entityMap = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
			"/": "&#x2F;",
			"`": "&#x60;",
			"=": "&#x3D;"
		};

		return String(string).replace(/[&<>"'`=\/]/g, function(s) {
			return entityMap[s];
		});
	}

	$(document).on("click", "[data-fancybox-share]", function() {
		var instance = $.fancybox.getInstance(),
			current = instance.current || null,
			url,
			tpl;

		if (!current) {
			return;
		}

		if ($.type(current.opts.share.url) === "function") {
			url = current.opts.share.url.apply(current, [instance, current]);
		}

		tpl = current.opts.share.tpl
			.replace(/\{\{media\}\}/g, current.type === "image" ? encodeURIComponent(current.src) : "")
			.replace(/\{\{url\}\}/g, encodeURIComponent(url))
			.replace(/\{\{url_raw\}\}/g, escapeHtml(url))
			.replace(/\{\{descr\}\}/g, instance.$caption ? encodeURIComponent(instance.$caption.text()) : "");

		$.fancybox.open({
			src: instance.translate(instance, tpl),
			type: "html",
			opts: {
				touch: false,
				animationEffect: false,
				afterLoad: function(shareInstance, shareCurrent) {
					// Close self if parent instance is closing
					instance.$refs.container.one("beforeClose.fb", function() {
						shareInstance.close(null, 0);
					});

					// Opening links in a popup window
					shareCurrent.$content.find(".fancybox-share__button").click(function() {
						window.open(this.href, "Share", "width=550, height=450");
						return false;
					});
				},
				mobile: {
					autoFocus: false
				}
			}
		});
	});
})(document, jQuery);

// ==========================================================================
//
// Hash
// Enables linking to each modal
//
// ==========================================================================
(function(window, document, $) {
	"use strict";

	// Simple $.escapeSelector polyfill (for jQuery prior v3)
	if (!$.escapeSelector) {
		$.escapeSelector = function(sel) {
			var rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g;
			var fcssescape = function(ch, asCodePoint) {
				if (asCodePoint) {
					// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
					if (ch === "\0") {
						return "\uFFFD";
					}

					// Control characters and (dependent upon position) numbers get escaped as code points
					return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
				}

				// Other potentially-special ASCII characters get backslash-escaped
				return "\\" + ch;
			};

			return (sel + "").replace(rcssescape, fcssescape);
		};
	}

	// Get info about gallery name and current index from url
	function parseUrl() {
		var hash = window.location.hash.substr(1),
			rez = hash.split("-"),
			index = rez.length > 1 && /^\+?\d+$/.test(rez[rez.length - 1]) ? parseInt(rez.pop(-1), 10) || 1 : 1,
			gallery = rez.join("-");

		return {
			hash: hash,
			/* Index is starting from 1 */
			index: index < 1 ? 1 : index,
			gallery: gallery
		};
	}

	// Trigger click evnt on links to open new fancyBox instance
	function triggerFromUrl(url) {
		if (url.gallery !== "") {
			// If we can find element matching 'data-fancybox' atribute,
			// then triggering click event should start fancyBox
			$("[data-fancybox='" + $.escapeSelector(url.gallery) + "']")
				.eq(url.index - 1)
				.focus()
				.trigger("click.fb-start");
		}
	}

	// Get gallery name from current instance
	function getGalleryID(instance) {
		var opts, ret;

		if (!instance) {
			return false;
		}

		opts = instance.current ? instance.current.opts : instance.opts;
		ret = opts.hash || (opts.$orig ? opts.$orig.data("fancybox") || opts.$orig.data("fancybox-trigger") : "");

		return ret === "" ? false : ret;
	}

	// Start when DOM becomes ready
	$(function() {
		// Check if user has disabled this module
		if ($.fancybox.defaults.hash === false) {
			return;
		}

		// Update hash when opening/closing fancyBox
		$(document).on({
			"onInit.fb": function(e, instance) {
				var url, gallery;

				if (instance.group[instance.currIndex].opts.hash === false) {
					return;
				}

				url = parseUrl();
				gallery = getGalleryID(instance);

				// Make sure gallery start index matches index from hash
				if (gallery && url.gallery && gallery == url.gallery) {
					instance.currIndex = url.index - 1;
				}
			},

			"beforeShow.fb": function(e, instance, current, firstRun) {
				var gallery;

				if (!current || current.opts.hash === false) {
					return;
				}

				// Check if need to update window hash
				gallery = getGalleryID(instance);

				if (!gallery) {
					return;
				}

				// Variable containing last hash value set by fancyBox
				// It will be used to determine if fancyBox needs to close after hash change is detected
				instance.currentHash = gallery + (instance.group.length > 1 ? "-" + (current.index + 1) : "");

				// If current hash is the same (this instance most likely is opened by hashchange), then do nothing
				if (window.location.hash === "#" + instance.currentHash) {
					return;
				}

				if (firstRun && !instance.origHash) {
					instance.origHash = window.location.hash;
				}

				if (instance.hashTimer) {
					clearTimeout(instance.hashTimer);
				}

				// Update hash
				instance.hashTimer = setTimeout(function() {
					if ("replaceState" in window.history) {
						window.history[firstRun ? "pushState" : "replaceState"](
							{},
							document.title,
							window.location.pathname + window.location.search + "#" + instance.currentHash
						);

						if (firstRun) {
							instance.hasCreatedHistory = true;
						}
					} else {
						window.location.hash = instance.currentHash;
					}

					instance.hashTimer = null;
				}, 300);
			},

			"beforeClose.fb": function(e, instance, current) {
				if (current.opts.hash === false) {
					return;
				}

				clearTimeout(instance.hashTimer);

				// Goto previous history entry
				if (instance.currentHash && instance.hasCreatedHistory) {
					window.history.back();
				} else if (instance.currentHash) {
					if ("replaceState" in window.history) {
						window.history.replaceState({}, document.title, window.location.pathname + window.location.search + (instance.origHash || ""));
					} else {
						window.location.hash = instance.origHash;
					}
				}

				instance.currentHash = null;
			}
		});

		// Check if need to start/close after url has changed
		$(window).on("hashchange.fb", function() {
			var url = parseUrl(),
				fb = null;

			// Find last fancyBox instance that has "hash"
			$.each(
				$(".fancybox-container")
					.get()
					.reverse(),
				function(index, value) {
					var tmp = $(value).data("FancyBox");

					if (tmp && tmp.currentHash) {
						fb = tmp;
						return false;
					}
				}
			);

			if (fb) {
				// Now, compare hash values
				if (fb.currentHash !== url.gallery + "-" + url.index && !(url.index === 1 && fb.currentHash == url.gallery)) {
					fb.currentHash = null;

					fb.close();
				}
			} else if (url.gallery !== "") {
				triggerFromUrl(url);
			}
		});

		// Check current hash and trigger click event on matching element to start fancyBox, if needed
		setTimeout(function() {
			if (!$.fancybox.getInstance()) {
				triggerFromUrl(parseUrl());
			}
		}, 50);
	});
})(window, document, jQuery);

// ==========================================================================
//
// Wheel
// Basic mouse weheel support for gallery navigation
//
// ==========================================================================
(function(document, $) {
	"use strict";

	var prevTime = new Date().getTime();

	$(document).on({
		"onInit.fb": function(e, instance, current) {
			instance.$refs.stage.on("mousewheel DOMMouseScroll wheel MozMousePixelScroll", function(e) {
				var current = instance.current,
					currTime = new Date().getTime();

				if (instance.group.length < 2 || current.opts.wheel === false || (current.opts.wheel === "auto" && current.type !== "image")) {
					return;
				}

				e.preventDefault();
				e.stopPropagation();

				if (current.$slide.hasClass("fancybox-animated")) {
					return;
				}

				e = e.originalEvent || e;

				if (currTime - prevTime < 250) {
					return;
				}

				prevTime = currTime;

				instance[(-e.deltaY || -e.deltaX || e.wheelDelta || -e.detail) < 0 ? "next" : "previous"]();
			});
		}
	});
})(document, jQuery);

(function ($) {
	$(document).ready(function () {
		app.init();
	});

	var app = {
		init: function () {
			this.accessibility();
			this.utils();
			// this.agenda();
			this.menu();
			console.log('App here! ');
		},

		/**
		 * Accessibility functions
		 *
		 */
		accessibility: function () {
			// High contrast
			$('#high-contrast-btn').click(function (e) {
				e.preventDefault();
				var highContrast = cookie('high-contrast');

				if (highContrast === 'on') {
					cookie('high-contrast', 'off');
					$('body').removeClass('high-contrast');
				} else {
					cookie('high-contrast', 'on');
					$('body').addClass('high-contrast');
				}
			})
		},

		/**
		 * Menu Functions
		 *
		 */
		menu: function () {
			// High contrast
			$('#menu-toggle').click(function () {
				$('body').toggleClass('menu-active');
			})

			$('#menu-wrapper, #menu-toggle').click(function(event){
				// event.stopPropagation();
			});

			$('#main-header').click(function(event){
				$('body').removeClass('menu-active');
			});

			$('.widget_nav_menu').click(function() {
				$(this).toggleClass('active');
			});
		},

		/**
		 * Utility functions, used on all sites
		 *
		 */
		utils: function () {
			// Enable bootstrap tooltip
			$('[data-toggle="tooltip"]').tooltip();

			// Fancybox for gallery media
			if( $('.gallery').length ){
				$('.gallery-item').each( function () {
					var caption = $(this).find('.gallery-caption').text();
					$(this).find('a').attr( 'data-caption', caption );
				});
				$('.gallery-item a').attr( 'data-fancybox', 'group' );
				$('.gallery-item a').fancybox({});
			}

			$('.toggle-active').click( function() {
				$(this).parent().toggleClass('active');
			});

			$('a.share-link').on('click', function(event) {
				event.preventDefault();
				var url = $(this).attr('href');
				showModal(url);
			});

			function showModal(url){
				window.open(url, "shareWindow", "width=600, height=400");
				return false;
			}

		},

		agenda: function () {
			$('#datepicker').datepicker({
				dayNamesMin: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
			});

			$('.monthpicker').on('click', function (e) {
				e.preventDefault();
				$('.monthpicker').datepicker('show');
			})
		}
	};
})(jQuery);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJidW5kbGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqIVxuICogQGZpbGVPdmVydmlldyBLaWNrYXNzIGxpYnJhcnkgdG8gY3JlYXRlIGFuZCBwbGFjZSBwb3BwZXJzIG5lYXIgdGhlaXIgcmVmZXJlbmNlIGVsZW1lbnRzLlxuICogQHZlcnNpb24gMS4xNC40XG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE2IEZlZGVyaWNvIFppdm9sbyBhbmQgY29udHJpYnV0b3JzXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiBTT0ZUV0FSRS5cbiAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuXHQoZ2xvYmFsLlBvcHBlciA9IGZhY3RvcnkoKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxudmFyIGlzQnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCc7XG5cbnZhciBsb25nZXJUaW1lb3V0QnJvd3NlcnMgPSBbJ0VkZ2UnLCAnVHJpZGVudCcsICdGaXJlZm94J107XG52YXIgdGltZW91dER1cmF0aW9uID0gMDtcbmZvciAodmFyIGkgPSAwOyBpIDwgbG9uZ2VyVGltZW91dEJyb3dzZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gIGlmIChpc0Jyb3dzZXIgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKGxvbmdlclRpbWVvdXRCcm93c2Vyc1tpXSkgPj0gMCkge1xuICAgIHRpbWVvdXREdXJhdGlvbiA9IDE7XG4gICAgYnJlYWs7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWljcm90YXNrRGVib3VuY2UoZm4pIHtcbiAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjYWxsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY2FsbGVkID0gdHJ1ZTtcbiAgICB3aW5kb3cuUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICBjYWxsZWQgPSBmYWxzZTtcbiAgICAgIGZuKCk7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRhc2tEZWJvdW5jZShmbikge1xuICB2YXIgc2NoZWR1bGVkID0gZmFsc2U7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFzY2hlZHVsZWQpIHtcbiAgICAgIHNjaGVkdWxlZCA9IHRydWU7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgIGZuKCk7XG4gICAgICB9LCB0aW1lb3V0RHVyYXRpb24pO1xuICAgIH1cbiAgfTtcbn1cblxudmFyIHN1cHBvcnRzTWljcm9UYXNrcyA9IGlzQnJvd3NlciAmJiB3aW5kb3cuUHJvbWlzZTtcblxuLyoqXG4qIENyZWF0ZSBhIGRlYm91bmNlZCB2ZXJzaW9uIG9mIGEgbWV0aG9kLCB0aGF0J3MgYXN5bmNocm9ub3VzbHkgZGVmZXJyZWRcbiogYnV0IGNhbGxlZCBpbiB0aGUgbWluaW11bSB0aW1lIHBvc3NpYmxlLlxuKlxuKiBAbWV0aG9kXG4qIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiogQGFyZ3VtZW50IHtGdW5jdGlvbn0gZm5cbiogQHJldHVybnMge0Z1bmN0aW9ufVxuKi9cbnZhciBkZWJvdW5jZSA9IHN1cHBvcnRzTWljcm9UYXNrcyA/IG1pY3JvdGFza0RlYm91bmNlIDogdGFza0RlYm91bmNlO1xuXG4vKipcbiAqIENoZWNrIGlmIHRoZSBnaXZlbiB2YXJpYWJsZSBpcyBhIGZ1bmN0aW9uXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0FueX0gZnVuY3Rpb25Ub0NoZWNrIC0gdmFyaWFibGUgdG8gY2hlY2tcbiAqIEByZXR1cm5zIHtCb29sZWFufSBhbnN3ZXIgdG86IGlzIGEgZnVuY3Rpb24/XG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oZnVuY3Rpb25Ub0NoZWNrKSB7XG4gIHZhciBnZXRUeXBlID0ge307XG4gIHJldHVybiBmdW5jdGlvblRvQ2hlY2sgJiYgZ2V0VHlwZS50b1N0cmluZy5jYWxsKGZ1bmN0aW9uVG9DaGVjaykgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbi8qKlxuICogR2V0IENTUyBjb21wdXRlZCBwcm9wZXJ0eSBvZiB0aGUgZ2l2ZW4gZWxlbWVudFxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFZW1lbnR9IGVsZW1lbnRcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBwcm9wZXJ0eVxuICovXG5mdW5jdGlvbiBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkoZWxlbWVudCwgcHJvcGVydHkpIHtcbiAgaWYgKGVsZW1lbnQubm9kZVR5cGUgIT09IDEpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgLy8gTk9URTogMSBET00gYWNjZXNzIGhlcmVcbiAgdmFyIGNzcyA9IGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCwgbnVsbCk7XG4gIHJldHVybiBwcm9wZXJ0eSA/IGNzc1twcm9wZXJ0eV0gOiBjc3M7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcGFyZW50Tm9kZSBvciB0aGUgaG9zdCBvZiB0aGUgZWxlbWVudFxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFbGVtZW50fSBlbGVtZW50XG4gKiBAcmV0dXJucyB7RWxlbWVudH0gcGFyZW50XG4gKi9cbmZ1bmN0aW9uIGdldFBhcmVudE5vZGUoZWxlbWVudCkge1xuICBpZiAoZWxlbWVudC5ub2RlTmFtZSA9PT0gJ0hUTUwnKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cbiAgcmV0dXJuIGVsZW1lbnQucGFyZW50Tm9kZSB8fCBlbGVtZW50Lmhvc3Q7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc2Nyb2xsaW5nIHBhcmVudCBvZiB0aGUgZ2l2ZW4gZWxlbWVudFxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFbGVtZW50fSBlbGVtZW50XG4gKiBAcmV0dXJucyB7RWxlbWVudH0gc2Nyb2xsIHBhcmVudFxuICovXG5mdW5jdGlvbiBnZXRTY3JvbGxQYXJlbnQoZWxlbWVudCkge1xuICAvLyBSZXR1cm4gYm9keSwgYGdldFNjcm9sbGAgd2lsbCB0YWtlIGNhcmUgdG8gZ2V0IHRoZSBjb3JyZWN0IGBzY3JvbGxUb3BgIGZyb20gaXRcbiAgaWYgKCFlbGVtZW50KSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmJvZHk7XG4gIH1cblxuICBzd2l0Y2ggKGVsZW1lbnQubm9kZU5hbWUpIHtcbiAgICBjYXNlICdIVE1MJzpcbiAgICBjYXNlICdCT0RZJzpcbiAgICAgIHJldHVybiBlbGVtZW50Lm93bmVyRG9jdW1lbnQuYm9keTtcbiAgICBjYXNlICcjZG9jdW1lbnQnOlxuICAgICAgcmV0dXJuIGVsZW1lbnQuYm9keTtcbiAgfVxuXG4gIC8vIEZpcmVmb3ggd2FudCB1cyB0byBjaGVjayBgLXhgIGFuZCBgLXlgIHZhcmlhdGlvbnMgYXMgd2VsbFxuXG4gIHZhciBfZ2V0U3R5bGVDb21wdXRlZFByb3AgPSBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkoZWxlbWVudCksXG4gICAgICBvdmVyZmxvdyA9IF9nZXRTdHlsZUNvbXB1dGVkUHJvcC5vdmVyZmxvdyxcbiAgICAgIG92ZXJmbG93WCA9IF9nZXRTdHlsZUNvbXB1dGVkUHJvcC5vdmVyZmxvd1gsXG4gICAgICBvdmVyZmxvd1kgPSBfZ2V0U3R5bGVDb21wdXRlZFByb3Aub3ZlcmZsb3dZO1xuXG4gIGlmICgvKGF1dG98c2Nyb2xsfG92ZXJsYXkpLy50ZXN0KG92ZXJmbG93ICsgb3ZlcmZsb3dZICsgb3ZlcmZsb3dYKSkge1xuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG5cbiAgcmV0dXJuIGdldFNjcm9sbFBhcmVudChnZXRQYXJlbnROb2RlKGVsZW1lbnQpKTtcbn1cblxudmFyIGlzSUUxMSA9IGlzQnJvd3NlciAmJiAhISh3aW5kb3cuTVNJbnB1dE1ldGhvZENvbnRleHQgJiYgZG9jdW1lbnQuZG9jdW1lbnRNb2RlKTtcbnZhciBpc0lFMTAgPSBpc0Jyb3dzZXIgJiYgL01TSUUgMTAvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB0aGUgYnJvd3NlciBpcyBJbnRlcm5ldCBFeHBsb3JlclxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHBhcmFtIHtOdW1iZXJ9IHZlcnNpb24gdG8gY2hlY2tcbiAqIEByZXR1cm5zIHtCb29sZWFufSBpc0lFXG4gKi9cbmZ1bmN0aW9uIGlzSUUodmVyc2lvbikge1xuICBpZiAodmVyc2lvbiA9PT0gMTEpIHtcbiAgICByZXR1cm4gaXNJRTExO1xuICB9XG4gIGlmICh2ZXJzaW9uID09PSAxMCkge1xuICAgIHJldHVybiBpc0lFMTA7XG4gIH1cbiAgcmV0dXJuIGlzSUUxMSB8fCBpc0lFMTA7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgb2Zmc2V0IHBhcmVudCBvZiB0aGUgZ2l2ZW4gZWxlbWVudFxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFbGVtZW50fSBlbGVtZW50XG4gKiBAcmV0dXJucyB7RWxlbWVudH0gb2Zmc2V0IHBhcmVudFxuICovXG5mdW5jdGlvbiBnZXRPZmZzZXRQYXJlbnQoZWxlbWVudCkge1xuICBpZiAoIWVsZW1lbnQpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICB9XG5cbiAgdmFyIG5vT2Zmc2V0UGFyZW50ID0gaXNJRSgxMCkgPyBkb2N1bWVudC5ib2R5IDogbnVsbDtcblxuICAvLyBOT1RFOiAxIERPTSBhY2Nlc3MgaGVyZVxuICB2YXIgb2Zmc2V0UGFyZW50ID0gZWxlbWVudC5vZmZzZXRQYXJlbnQ7XG4gIC8vIFNraXAgaGlkZGVuIGVsZW1lbnRzIHdoaWNoIGRvbid0IGhhdmUgYW4gb2Zmc2V0UGFyZW50XG4gIHdoaWxlIChvZmZzZXRQYXJlbnQgPT09IG5vT2Zmc2V0UGFyZW50ICYmIGVsZW1lbnQubmV4dEVsZW1lbnRTaWJsaW5nKSB7XG4gICAgb2Zmc2V0UGFyZW50ID0gKGVsZW1lbnQgPSBlbGVtZW50Lm5leHRFbGVtZW50U2libGluZykub2Zmc2V0UGFyZW50O1xuICB9XG5cbiAgdmFyIG5vZGVOYW1lID0gb2Zmc2V0UGFyZW50ICYmIG9mZnNldFBhcmVudC5ub2RlTmFtZTtcblxuICBpZiAoIW5vZGVOYW1lIHx8IG5vZGVOYW1lID09PSAnQk9EWScgfHwgbm9kZU5hbWUgPT09ICdIVE1MJykge1xuICAgIHJldHVybiBlbGVtZW50ID8gZWxlbWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudCA6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgfVxuXG4gIC8vIC5vZmZzZXRQYXJlbnQgd2lsbCByZXR1cm4gdGhlIGNsb3Nlc3QgVEQgb3IgVEFCTEUgaW4gY2FzZVxuICAvLyBubyBvZmZzZXRQYXJlbnQgaXMgcHJlc2VudCwgSSBoYXRlIHRoaXMgam9iLi4uXG4gIGlmIChbJ1REJywgJ1RBQkxFJ10uaW5kZXhPZihvZmZzZXRQYXJlbnQubm9kZU5hbWUpICE9PSAtMSAmJiBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkob2Zmc2V0UGFyZW50LCAncG9zaXRpb24nKSA9PT0gJ3N0YXRpYycpIHtcbiAgICByZXR1cm4gZ2V0T2Zmc2V0UGFyZW50KG9mZnNldFBhcmVudCk7XG4gIH1cblxuICByZXR1cm4gb2Zmc2V0UGFyZW50O1xufVxuXG5mdW5jdGlvbiBpc09mZnNldENvbnRhaW5lcihlbGVtZW50KSB7XG4gIHZhciBub2RlTmFtZSA9IGVsZW1lbnQubm9kZU5hbWU7XG5cbiAgaWYgKG5vZGVOYW1lID09PSAnQk9EWScpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIG5vZGVOYW1lID09PSAnSFRNTCcgfHwgZ2V0T2Zmc2V0UGFyZW50KGVsZW1lbnQuZmlyc3RFbGVtZW50Q2hpbGQpID09PSBlbGVtZW50O1xufVxuXG4vKipcbiAqIEZpbmRzIHRoZSByb290IG5vZGUgKGRvY3VtZW50LCBzaGFkb3dET00gcm9vdCkgb2YgdGhlIGdpdmVuIGVsZW1lbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gbm9kZVxuICogQHJldHVybnMge0VsZW1lbnR9IHJvb3Qgbm9kZVxuICovXG5mdW5jdGlvbiBnZXRSb290KG5vZGUpIHtcbiAgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gbnVsbCkge1xuICAgIHJldHVybiBnZXRSb290KG5vZGUucGFyZW50Tm9kZSk7XG4gIH1cblxuICByZXR1cm4gbm9kZTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgb2Zmc2V0IHBhcmVudCBjb21tb24gdG8gdGhlIHR3byBwcm92aWRlZCBub2Rlc1xuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFbGVtZW50fSBlbGVtZW50MVxuICogQGFyZ3VtZW50IHtFbGVtZW50fSBlbGVtZW50MlxuICogQHJldHVybnMge0VsZW1lbnR9IGNvbW1vbiBvZmZzZXQgcGFyZW50XG4gKi9cbmZ1bmN0aW9uIGZpbmRDb21tb25PZmZzZXRQYXJlbnQoZWxlbWVudDEsIGVsZW1lbnQyKSB7XG4gIC8vIFRoaXMgY2hlY2sgaXMgbmVlZGVkIHRvIGF2b2lkIGVycm9ycyBpbiBjYXNlIG9uZSBvZiB0aGUgZWxlbWVudHMgaXNuJ3QgZGVmaW5lZCBmb3IgYW55IHJlYXNvblxuICBpZiAoIWVsZW1lbnQxIHx8ICFlbGVtZW50MS5ub2RlVHlwZSB8fCAhZWxlbWVudDIgfHwgIWVsZW1lbnQyLm5vZGVUeXBlKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgfVxuXG4gIC8vIEhlcmUgd2UgbWFrZSBzdXJlIHRvIGdpdmUgYXMgXCJzdGFydFwiIHRoZSBlbGVtZW50IHRoYXQgY29tZXMgZmlyc3QgaW4gdGhlIERPTVxuICB2YXIgb3JkZXIgPSBlbGVtZW50MS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbihlbGVtZW50MikgJiBOb2RlLkRPQ1VNRU5UX1BPU0lUSU9OX0ZPTExPV0lORztcbiAgdmFyIHN0YXJ0ID0gb3JkZXIgPyBlbGVtZW50MSA6IGVsZW1lbnQyO1xuICB2YXIgZW5kID0gb3JkZXIgPyBlbGVtZW50MiA6IGVsZW1lbnQxO1xuXG4gIC8vIEdldCBjb21tb24gYW5jZXN0b3IgY29udGFpbmVyXG4gIHZhciByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XG4gIHJhbmdlLnNldFN0YXJ0KHN0YXJ0LCAwKTtcbiAgcmFuZ2Uuc2V0RW5kKGVuZCwgMCk7XG4gIHZhciBjb21tb25BbmNlc3RvckNvbnRhaW5lciA9IHJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyO1xuXG4gIC8vIEJvdGggbm9kZXMgYXJlIGluc2lkZSAjZG9jdW1lbnRcblxuICBpZiAoZWxlbWVudDEgIT09IGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyICYmIGVsZW1lbnQyICE9PSBjb21tb25BbmNlc3RvckNvbnRhaW5lciB8fCBzdGFydC5jb250YWlucyhlbmQpKSB7XG4gICAgaWYgKGlzT2Zmc2V0Q29udGFpbmVyKGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKSkge1xuICAgICAgcmV0dXJuIGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyO1xuICAgIH1cblxuICAgIHJldHVybiBnZXRPZmZzZXRQYXJlbnQoY29tbW9uQW5jZXN0b3JDb250YWluZXIpO1xuICB9XG5cbiAgLy8gb25lIG9mIHRoZSBub2RlcyBpcyBpbnNpZGUgc2hhZG93RE9NLCBmaW5kIHdoaWNoIG9uZVxuICB2YXIgZWxlbWVudDFyb290ID0gZ2V0Um9vdChlbGVtZW50MSk7XG4gIGlmIChlbGVtZW50MXJvb3QuaG9zdCkge1xuICAgIHJldHVybiBmaW5kQ29tbW9uT2Zmc2V0UGFyZW50KGVsZW1lbnQxcm9vdC5ob3N0LCBlbGVtZW50Mik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZpbmRDb21tb25PZmZzZXRQYXJlbnQoZWxlbWVudDEsIGdldFJvb3QoZWxlbWVudDIpLmhvc3QpO1xuICB9XG59XG5cbi8qKlxuICogR2V0cyB0aGUgc2Nyb2xsIHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50IGluIHRoZSBnaXZlbiBzaWRlICh0b3AgYW5kIGxlZnQpXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBzaWRlIGB0b3BgIG9yIGBsZWZ0YFxuICogQHJldHVybnMge251bWJlcn0gYW1vdW50IG9mIHNjcm9sbGVkIHBpeGVsc1xuICovXG5mdW5jdGlvbiBnZXRTY3JvbGwoZWxlbWVudCkge1xuICB2YXIgc2lkZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogJ3RvcCc7XG5cbiAgdmFyIHVwcGVyU2lkZSA9IHNpZGUgPT09ICd0b3AnID8gJ3Njcm9sbFRvcCcgOiAnc2Nyb2xsTGVmdCc7XG4gIHZhciBub2RlTmFtZSA9IGVsZW1lbnQubm9kZU5hbWU7XG5cbiAgaWYgKG5vZGVOYW1lID09PSAnQk9EWScgfHwgbm9kZU5hbWUgPT09ICdIVE1MJykge1xuICAgIHZhciBodG1sID0gZWxlbWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICB2YXIgc2Nyb2xsaW5nRWxlbWVudCA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5zY3JvbGxpbmdFbGVtZW50IHx8IGh0bWw7XG4gICAgcmV0dXJuIHNjcm9sbGluZ0VsZW1lbnRbdXBwZXJTaWRlXTtcbiAgfVxuXG4gIHJldHVybiBlbGVtZW50W3VwcGVyU2lkZV07XG59XG5cbi8qXG4gKiBTdW0gb3Igc3VidHJhY3QgdGhlIGVsZW1lbnQgc2Nyb2xsIHZhbHVlcyAobGVmdCBhbmQgdG9wKSBmcm9tIGEgZ2l2ZW4gcmVjdCBvYmplY3RcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7T2JqZWN0fSByZWN0IC0gUmVjdCBvYmplY3QgeW91IHdhbnQgdG8gY2hhbmdlXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IC0gVGhlIGVsZW1lbnQgZnJvbSB0aGUgZnVuY3Rpb24gcmVhZHMgdGhlIHNjcm9sbCB2YWx1ZXNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gc3VidHJhY3QgLSBzZXQgdG8gdHJ1ZSBpZiB5b3Ugd2FudCB0byBzdWJ0cmFjdCB0aGUgc2Nyb2xsIHZhbHVlc1xuICogQHJldHVybiB7T2JqZWN0fSByZWN0IC0gVGhlIG1vZGlmaWVyIHJlY3Qgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIGluY2x1ZGVTY3JvbGwocmVjdCwgZWxlbWVudCkge1xuICB2YXIgc3VidHJhY3QgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IGZhbHNlO1xuXG4gIHZhciBzY3JvbGxUb3AgPSBnZXRTY3JvbGwoZWxlbWVudCwgJ3RvcCcpO1xuICB2YXIgc2Nyb2xsTGVmdCA9IGdldFNjcm9sbChlbGVtZW50LCAnbGVmdCcpO1xuICB2YXIgbW9kaWZpZXIgPSBzdWJ0cmFjdCA/IC0xIDogMTtcbiAgcmVjdC50b3AgKz0gc2Nyb2xsVG9wICogbW9kaWZpZXI7XG4gIHJlY3QuYm90dG9tICs9IHNjcm9sbFRvcCAqIG1vZGlmaWVyO1xuICByZWN0LmxlZnQgKz0gc2Nyb2xsTGVmdCAqIG1vZGlmaWVyO1xuICByZWN0LnJpZ2h0ICs9IHNjcm9sbExlZnQgKiBtb2RpZmllcjtcbiAgcmV0dXJuIHJlY3Q7XG59XG5cbi8qXG4gKiBIZWxwZXIgdG8gZGV0ZWN0IGJvcmRlcnMgb2YgYSBnaXZlbiBlbGVtZW50XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge0NTU1N0eWxlRGVjbGFyYXRpb259IHN0eWxlc1xuICogUmVzdWx0IG9mIGBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHlgIG9uIHRoZSBnaXZlbiBlbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gYXhpcyAtIGB4YCBvciBgeWBcbiAqIEByZXR1cm4ge251bWJlcn0gYm9yZGVycyAtIFRoZSBib3JkZXJzIHNpemUgb2YgdGhlIGdpdmVuIGF4aXNcbiAqL1xuXG5mdW5jdGlvbiBnZXRCb3JkZXJzU2l6ZShzdHlsZXMsIGF4aXMpIHtcbiAgdmFyIHNpZGVBID0gYXhpcyA9PT0gJ3gnID8gJ0xlZnQnIDogJ1RvcCc7XG4gIHZhciBzaWRlQiA9IHNpZGVBID09PSAnTGVmdCcgPyAnUmlnaHQnIDogJ0JvdHRvbSc7XG5cbiAgcmV0dXJuIHBhcnNlRmxvYXQoc3R5bGVzWydib3JkZXInICsgc2lkZUEgKyAnV2lkdGgnXSwgMTApICsgcGFyc2VGbG9hdChzdHlsZXNbJ2JvcmRlcicgKyBzaWRlQiArICdXaWR0aCddLCAxMCk7XG59XG5cbmZ1bmN0aW9uIGdldFNpemUoYXhpcywgYm9keSwgaHRtbCwgY29tcHV0ZWRTdHlsZSkge1xuICByZXR1cm4gTWF0aC5tYXgoYm9keVsnb2Zmc2V0JyArIGF4aXNdLCBib2R5WydzY3JvbGwnICsgYXhpc10sIGh0bWxbJ2NsaWVudCcgKyBheGlzXSwgaHRtbFsnb2Zmc2V0JyArIGF4aXNdLCBodG1sWydzY3JvbGwnICsgYXhpc10sIGlzSUUoMTApID8gcGFyc2VJbnQoaHRtbFsnb2Zmc2V0JyArIGF4aXNdKSArIHBhcnNlSW50KGNvbXB1dGVkU3R5bGVbJ21hcmdpbicgKyAoYXhpcyA9PT0gJ0hlaWdodCcgPyAnVG9wJyA6ICdMZWZ0JyldKSArIHBhcnNlSW50KGNvbXB1dGVkU3R5bGVbJ21hcmdpbicgKyAoYXhpcyA9PT0gJ0hlaWdodCcgPyAnQm90dG9tJyA6ICdSaWdodCcpXSkgOiAwKTtcbn1cblxuZnVuY3Rpb24gZ2V0V2luZG93U2l6ZXMoZG9jdW1lbnQpIHtcbiAgdmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICB2YXIgaHRtbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgdmFyIGNvbXB1dGVkU3R5bGUgPSBpc0lFKDEwKSAmJiBnZXRDb21wdXRlZFN0eWxlKGh0bWwpO1xuXG4gIHJldHVybiB7XG4gICAgaGVpZ2h0OiBnZXRTaXplKCdIZWlnaHQnLCBib2R5LCBodG1sLCBjb21wdXRlZFN0eWxlKSxcbiAgICB3aWR0aDogZ2V0U2l6ZSgnV2lkdGgnLCBib2R5LCBodG1sLCBjb21wdXRlZFN0eWxlKVxuICB9O1xufVxuXG52YXIgY2xhc3NDYWxsQ2hlY2sgPSBmdW5jdGlvbiAoaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7XG4gIGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTtcbiAgfVxufTtcblxudmFyIGNyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldO1xuICAgICAgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlO1xuICAgICAgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlO1xuICAgICAgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7XG4gICAgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7XG4gICAgcmV0dXJuIENvbnN0cnVjdG9yO1xuICB9O1xufSgpO1xuXG5cblxuXG5cbnZhciBkZWZpbmVQcm9wZXJ0eSA9IGZ1bmN0aW9uIChvYmosIGtleSwgdmFsdWUpIHtcbiAgaWYgKGtleSBpbiBvYmopIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIG9ialtrZXldID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7XG4gICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbi8qKlxuICogR2l2ZW4gZWxlbWVudCBvZmZzZXRzLCBnZW5lcmF0ZSBhbiBvdXRwdXQgc2ltaWxhciB0byBnZXRCb3VuZGluZ0NsaWVudFJlY3RcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvZmZzZXRzXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBDbGllbnRSZWN0IGxpa2Ugb3V0cHV0XG4gKi9cbmZ1bmN0aW9uIGdldENsaWVudFJlY3Qob2Zmc2V0cykge1xuICByZXR1cm4gX2V4dGVuZHMoe30sIG9mZnNldHMsIHtcbiAgICByaWdodDogb2Zmc2V0cy5sZWZ0ICsgb2Zmc2V0cy53aWR0aCxcbiAgICBib3R0b206IG9mZnNldHMudG9wICsgb2Zmc2V0cy5oZWlnaHRcbiAgfSk7XG59XG5cbi8qKlxuICogR2V0IGJvdW5kaW5nIGNsaWVudCByZWN0IG9mIGdpdmVuIGVsZW1lbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnRcbiAqIEByZXR1cm4ge09iamVjdH0gY2xpZW50IHJlY3RcbiAqL1xuZnVuY3Rpb24gZ2V0Qm91bmRpbmdDbGllbnRSZWN0KGVsZW1lbnQpIHtcbiAgdmFyIHJlY3QgPSB7fTtcblxuICAvLyBJRTEwIDEwIEZJWDogUGxlYXNlLCBkb24ndCBhc2ssIHRoZSBlbGVtZW50IGlzbid0XG4gIC8vIGNvbnNpZGVyZWQgaW4gRE9NIGluIHNvbWUgY2lyY3Vtc3RhbmNlcy4uLlxuICAvLyBUaGlzIGlzbid0IHJlcHJvZHVjaWJsZSBpbiBJRTEwIGNvbXBhdGliaWxpdHkgbW9kZSBvZiBJRTExXG4gIHRyeSB7XG4gICAgaWYgKGlzSUUoMTApKSB7XG4gICAgICByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHZhciBzY3JvbGxUb3AgPSBnZXRTY3JvbGwoZWxlbWVudCwgJ3RvcCcpO1xuICAgICAgdmFyIHNjcm9sbExlZnQgPSBnZXRTY3JvbGwoZWxlbWVudCwgJ2xlZnQnKTtcbiAgICAgIHJlY3QudG9wICs9IHNjcm9sbFRvcDtcbiAgICAgIHJlY3QubGVmdCArPSBzY3JvbGxMZWZ0O1xuICAgICAgcmVjdC5ib3R0b20gKz0gc2Nyb2xsVG9wO1xuICAgICAgcmVjdC5yaWdodCArPSBzY3JvbGxMZWZ0O1xuICAgIH0gZWxzZSB7XG4gICAgICByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHt9XG5cbiAgdmFyIHJlc3VsdCA9IHtcbiAgICBsZWZ0OiByZWN0LmxlZnQsXG4gICAgdG9wOiByZWN0LnRvcCxcbiAgICB3aWR0aDogcmVjdC5yaWdodCAtIHJlY3QubGVmdCxcbiAgICBoZWlnaHQ6IHJlY3QuYm90dG9tIC0gcmVjdC50b3BcbiAgfTtcblxuICAvLyBzdWJ0cmFjdCBzY3JvbGxiYXIgc2l6ZSBmcm9tIHNpemVzXG4gIHZhciBzaXplcyA9IGVsZW1lbnQubm9kZU5hbWUgPT09ICdIVE1MJyA/IGdldFdpbmRvd1NpemVzKGVsZW1lbnQub3duZXJEb2N1bWVudCkgOiB7fTtcbiAgdmFyIHdpZHRoID0gc2l6ZXMud2lkdGggfHwgZWxlbWVudC5jbGllbnRXaWR0aCB8fCByZXN1bHQucmlnaHQgLSByZXN1bHQubGVmdDtcbiAgdmFyIGhlaWdodCA9IHNpemVzLmhlaWdodCB8fCBlbGVtZW50LmNsaWVudEhlaWdodCB8fCByZXN1bHQuYm90dG9tIC0gcmVzdWx0LnRvcDtcblxuICB2YXIgaG9yaXpTY3JvbGxiYXIgPSBlbGVtZW50Lm9mZnNldFdpZHRoIC0gd2lkdGg7XG4gIHZhciB2ZXJ0U2Nyb2xsYmFyID0gZWxlbWVudC5vZmZzZXRIZWlnaHQgLSBoZWlnaHQ7XG5cbiAgLy8gaWYgYW4gaHlwb3RoZXRpY2FsIHNjcm9sbGJhciBpcyBkZXRlY3RlZCwgd2UgbXVzdCBiZSBzdXJlIGl0J3Mgbm90IGEgYGJvcmRlcmBcbiAgLy8gd2UgbWFrZSB0aGlzIGNoZWNrIGNvbmRpdGlvbmFsIGZvciBwZXJmb3JtYW5jZSByZWFzb25zXG4gIGlmIChob3JpelNjcm9sbGJhciB8fCB2ZXJ0U2Nyb2xsYmFyKSB7XG4gICAgdmFyIHN0eWxlcyA9IGdldFN0eWxlQ29tcHV0ZWRQcm9wZXJ0eShlbGVtZW50KTtcbiAgICBob3JpelNjcm9sbGJhciAtPSBnZXRCb3JkZXJzU2l6ZShzdHlsZXMsICd4Jyk7XG4gICAgdmVydFNjcm9sbGJhciAtPSBnZXRCb3JkZXJzU2l6ZShzdHlsZXMsICd5Jyk7XG5cbiAgICByZXN1bHQud2lkdGggLT0gaG9yaXpTY3JvbGxiYXI7XG4gICAgcmVzdWx0LmhlaWdodCAtPSB2ZXJ0U2Nyb2xsYmFyO1xuICB9XG5cbiAgcmV0dXJuIGdldENsaWVudFJlY3QocmVzdWx0KTtcbn1cblxuZnVuY3Rpb24gZ2V0T2Zmc2V0UmVjdFJlbGF0aXZlVG9BcmJpdHJhcnlOb2RlKGNoaWxkcmVuLCBwYXJlbnQpIHtcbiAgdmFyIGZpeGVkUG9zaXRpb24gPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IGZhbHNlO1xuXG4gIHZhciBpc0lFMTAgPSBpc0lFKDEwKTtcbiAgdmFyIGlzSFRNTCA9IHBhcmVudC5ub2RlTmFtZSA9PT0gJ0hUTUwnO1xuICB2YXIgY2hpbGRyZW5SZWN0ID0gZ2V0Qm91bmRpbmdDbGllbnRSZWN0KGNoaWxkcmVuKTtcbiAgdmFyIHBhcmVudFJlY3QgPSBnZXRCb3VuZGluZ0NsaWVudFJlY3QocGFyZW50KTtcbiAgdmFyIHNjcm9sbFBhcmVudCA9IGdldFNjcm9sbFBhcmVudChjaGlsZHJlbik7XG5cbiAgdmFyIHN0eWxlcyA9IGdldFN0eWxlQ29tcHV0ZWRQcm9wZXJ0eShwYXJlbnQpO1xuICB2YXIgYm9yZGVyVG9wV2lkdGggPSBwYXJzZUZsb2F0KHN0eWxlcy5ib3JkZXJUb3BXaWR0aCwgMTApO1xuICB2YXIgYm9yZGVyTGVmdFdpZHRoID0gcGFyc2VGbG9hdChzdHlsZXMuYm9yZGVyTGVmdFdpZHRoLCAxMCk7XG5cbiAgLy8gSW4gY2FzZXMgd2hlcmUgdGhlIHBhcmVudCBpcyBmaXhlZCwgd2UgbXVzdCBpZ25vcmUgbmVnYXRpdmUgc2Nyb2xsIGluIG9mZnNldCBjYWxjXG4gIGlmIChmaXhlZFBvc2l0aW9uICYmIGlzSFRNTCkge1xuICAgIHBhcmVudFJlY3QudG9wID0gTWF0aC5tYXgocGFyZW50UmVjdC50b3AsIDApO1xuICAgIHBhcmVudFJlY3QubGVmdCA9IE1hdGgubWF4KHBhcmVudFJlY3QubGVmdCwgMCk7XG4gIH1cbiAgdmFyIG9mZnNldHMgPSBnZXRDbGllbnRSZWN0KHtcbiAgICB0b3A6IGNoaWxkcmVuUmVjdC50b3AgLSBwYXJlbnRSZWN0LnRvcCAtIGJvcmRlclRvcFdpZHRoLFxuICAgIGxlZnQ6IGNoaWxkcmVuUmVjdC5sZWZ0IC0gcGFyZW50UmVjdC5sZWZ0IC0gYm9yZGVyTGVmdFdpZHRoLFxuICAgIHdpZHRoOiBjaGlsZHJlblJlY3Qud2lkdGgsXG4gICAgaGVpZ2h0OiBjaGlsZHJlblJlY3QuaGVpZ2h0XG4gIH0pO1xuICBvZmZzZXRzLm1hcmdpblRvcCA9IDA7XG4gIG9mZnNldHMubWFyZ2luTGVmdCA9IDA7XG5cbiAgLy8gU3VidHJhY3QgbWFyZ2lucyBvZiBkb2N1bWVudEVsZW1lbnQgaW4gY2FzZSBpdCdzIGJlaW5nIHVzZWQgYXMgcGFyZW50XG4gIC8vIHdlIGRvIHRoaXMgb25seSBvbiBIVE1MIGJlY2F1c2UgaXQncyB0aGUgb25seSBlbGVtZW50IHRoYXQgYmVoYXZlc1xuICAvLyBkaWZmZXJlbnRseSB3aGVuIG1hcmdpbnMgYXJlIGFwcGxpZWQgdG8gaXQuIFRoZSBtYXJnaW5zIGFyZSBpbmNsdWRlZCBpblxuICAvLyB0aGUgYm94IG9mIHRoZSBkb2N1bWVudEVsZW1lbnQsIGluIHRoZSBvdGhlciBjYXNlcyBub3QuXG4gIGlmICghaXNJRTEwICYmIGlzSFRNTCkge1xuICAgIHZhciBtYXJnaW5Ub3AgPSBwYXJzZUZsb2F0KHN0eWxlcy5tYXJnaW5Ub3AsIDEwKTtcbiAgICB2YXIgbWFyZ2luTGVmdCA9IHBhcnNlRmxvYXQoc3R5bGVzLm1hcmdpbkxlZnQsIDEwKTtcblxuICAgIG9mZnNldHMudG9wIC09IGJvcmRlclRvcFdpZHRoIC0gbWFyZ2luVG9wO1xuICAgIG9mZnNldHMuYm90dG9tIC09IGJvcmRlclRvcFdpZHRoIC0gbWFyZ2luVG9wO1xuICAgIG9mZnNldHMubGVmdCAtPSBib3JkZXJMZWZ0V2lkdGggLSBtYXJnaW5MZWZ0O1xuICAgIG9mZnNldHMucmlnaHQgLT0gYm9yZGVyTGVmdFdpZHRoIC0gbWFyZ2luTGVmdDtcblxuICAgIC8vIEF0dGFjaCBtYXJnaW5Ub3AgYW5kIG1hcmdpbkxlZnQgYmVjYXVzZSBpbiBzb21lIGNpcmN1bXN0YW5jZXMgd2UgbWF5IG5lZWQgdGhlbVxuICAgIG9mZnNldHMubWFyZ2luVG9wID0gbWFyZ2luVG9wO1xuICAgIG9mZnNldHMubWFyZ2luTGVmdCA9IG1hcmdpbkxlZnQ7XG4gIH1cblxuICBpZiAoaXNJRTEwICYmICFmaXhlZFBvc2l0aW9uID8gcGFyZW50LmNvbnRhaW5zKHNjcm9sbFBhcmVudCkgOiBwYXJlbnQgPT09IHNjcm9sbFBhcmVudCAmJiBzY3JvbGxQYXJlbnQubm9kZU5hbWUgIT09ICdCT0RZJykge1xuICAgIG9mZnNldHMgPSBpbmNsdWRlU2Nyb2xsKG9mZnNldHMsIHBhcmVudCk7XG4gIH1cblxuICByZXR1cm4gb2Zmc2V0cztcbn1cblxuZnVuY3Rpb24gZ2V0Vmlld3BvcnRPZmZzZXRSZWN0UmVsYXRpdmVUb0FydGJpdHJhcnlOb2RlKGVsZW1lbnQpIHtcbiAgdmFyIGV4Y2x1ZGVTY3JvbGwgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IGZhbHNlO1xuXG4gIHZhciBodG1sID0gZWxlbWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgdmFyIHJlbGF0aXZlT2Zmc2V0ID0gZ2V0T2Zmc2V0UmVjdFJlbGF0aXZlVG9BcmJpdHJhcnlOb2RlKGVsZW1lbnQsIGh0bWwpO1xuICB2YXIgd2lkdGggPSBNYXRoLm1heChodG1sLmNsaWVudFdpZHRoLCB3aW5kb3cuaW5uZXJXaWR0aCB8fCAwKTtcbiAgdmFyIGhlaWdodCA9IE1hdGgubWF4KGh0bWwuY2xpZW50SGVpZ2h0LCB3aW5kb3cuaW5uZXJIZWlnaHQgfHwgMCk7XG5cbiAgdmFyIHNjcm9sbFRvcCA9ICFleGNsdWRlU2Nyb2xsID8gZ2V0U2Nyb2xsKGh0bWwpIDogMDtcbiAgdmFyIHNjcm9sbExlZnQgPSAhZXhjbHVkZVNjcm9sbCA/IGdldFNjcm9sbChodG1sLCAnbGVmdCcpIDogMDtcblxuICB2YXIgb2Zmc2V0ID0ge1xuICAgIHRvcDogc2Nyb2xsVG9wIC0gcmVsYXRpdmVPZmZzZXQudG9wICsgcmVsYXRpdmVPZmZzZXQubWFyZ2luVG9wLFxuICAgIGxlZnQ6IHNjcm9sbExlZnQgLSByZWxhdGl2ZU9mZnNldC5sZWZ0ICsgcmVsYXRpdmVPZmZzZXQubWFyZ2luTGVmdCxcbiAgICB3aWR0aDogd2lkdGgsXG4gICAgaGVpZ2h0OiBoZWlnaHRcbiAgfTtcblxuICByZXR1cm4gZ2V0Q2xpZW50UmVjdChvZmZzZXQpO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIHRoZSBnaXZlbiBlbGVtZW50IGlzIGZpeGVkIG9yIGlzIGluc2lkZSBhIGZpeGVkIHBhcmVudFxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFbGVtZW50fSBlbGVtZW50XG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGN1c3RvbUNvbnRhaW5lclxuICogQHJldHVybnMge0Jvb2xlYW59IGFuc3dlciB0byBcImlzRml4ZWQ/XCJcbiAqL1xuZnVuY3Rpb24gaXNGaXhlZChlbGVtZW50KSB7XG4gIHZhciBub2RlTmFtZSA9IGVsZW1lbnQubm9kZU5hbWU7XG4gIGlmIChub2RlTmFtZSA9PT0gJ0JPRFknIHx8IG5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGdldFN0eWxlQ29tcHV0ZWRQcm9wZXJ0eShlbGVtZW50LCAncG9zaXRpb24nKSA9PT0gJ2ZpeGVkJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBpc0ZpeGVkKGdldFBhcmVudE5vZGUoZWxlbWVudCkpO1xufVxuXG4vKipcbiAqIEZpbmRzIHRoZSBmaXJzdCBwYXJlbnQgb2YgYW4gZWxlbWVudCB0aGF0IGhhcyBhIHRyYW5zZm9ybWVkIHByb3BlcnR5IGRlZmluZWRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge0VsZW1lbnR9IGZpcnN0IHRyYW5zZm9ybWVkIHBhcmVudCBvciBkb2N1bWVudEVsZW1lbnRcbiAqL1xuXG5mdW5jdGlvbiBnZXRGaXhlZFBvc2l0aW9uT2Zmc2V0UGFyZW50KGVsZW1lbnQpIHtcbiAgLy8gVGhpcyBjaGVjayBpcyBuZWVkZWQgdG8gYXZvaWQgZXJyb3JzIGluIGNhc2Ugb25lIG9mIHRoZSBlbGVtZW50cyBpc24ndCBkZWZpbmVkIGZvciBhbnkgcmVhc29uXG4gIGlmICghZWxlbWVudCB8fCAhZWxlbWVudC5wYXJlbnRFbGVtZW50IHx8IGlzSUUoKSkge1xuICAgIHJldHVybiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIH1cbiAgdmFyIGVsID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICB3aGlsZSAoZWwgJiYgZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5KGVsLCAndHJhbnNmb3JtJykgPT09ICdub25lJykge1xuICAgIGVsID0gZWwucGFyZW50RWxlbWVudDtcbiAgfVxuICByZXR1cm4gZWwgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xufVxuXG4vKipcbiAqIENvbXB1dGVkIHRoZSBib3VuZGFyaWVzIGxpbWl0cyBhbmQgcmV0dXJuIHRoZW1cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHBvcHBlclxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcmVmZXJlbmNlXG4gKiBAcGFyYW0ge251bWJlcn0gcGFkZGluZ1xuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gYm91bmRhcmllc0VsZW1lbnQgLSBFbGVtZW50IHVzZWQgdG8gZGVmaW5lIHRoZSBib3VuZGFyaWVzXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGZpeGVkUG9zaXRpb24gLSBJcyBpbiBmaXhlZCBwb3NpdGlvbiBtb2RlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBDb29yZGluYXRlcyBvZiB0aGUgYm91bmRhcmllc1xuICovXG5mdW5jdGlvbiBnZXRCb3VuZGFyaWVzKHBvcHBlciwgcmVmZXJlbmNlLCBwYWRkaW5nLCBib3VuZGFyaWVzRWxlbWVudCkge1xuICB2YXIgZml4ZWRQb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiA0ICYmIGFyZ3VtZW50c1s0XSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzRdIDogZmFsc2U7XG5cbiAgLy8gTk9URTogMSBET00gYWNjZXNzIGhlcmVcblxuICB2YXIgYm91bmRhcmllcyA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gIHZhciBvZmZzZXRQYXJlbnQgPSBmaXhlZFBvc2l0aW9uID8gZ2V0Rml4ZWRQb3NpdGlvbk9mZnNldFBhcmVudChwb3BwZXIpIDogZmluZENvbW1vbk9mZnNldFBhcmVudChwb3BwZXIsIHJlZmVyZW5jZSk7XG5cbiAgLy8gSGFuZGxlIHZpZXdwb3J0IGNhc2VcbiAgaWYgKGJvdW5kYXJpZXNFbGVtZW50ID09PSAndmlld3BvcnQnKSB7XG4gICAgYm91bmRhcmllcyA9IGdldFZpZXdwb3J0T2Zmc2V0UmVjdFJlbGF0aXZlVG9BcnRiaXRyYXJ5Tm9kZShvZmZzZXRQYXJlbnQsIGZpeGVkUG9zaXRpb24pO1xuICB9IGVsc2Uge1xuICAgIC8vIEhhbmRsZSBvdGhlciBjYXNlcyBiYXNlZCBvbiBET00gZWxlbWVudCB1c2VkIGFzIGJvdW5kYXJpZXNcbiAgICB2YXIgYm91bmRhcmllc05vZGUgPSB2b2lkIDA7XG4gICAgaWYgKGJvdW5kYXJpZXNFbGVtZW50ID09PSAnc2Nyb2xsUGFyZW50Jykge1xuICAgICAgYm91bmRhcmllc05vZGUgPSBnZXRTY3JvbGxQYXJlbnQoZ2V0UGFyZW50Tm9kZShyZWZlcmVuY2UpKTtcbiAgICAgIGlmIChib3VuZGFyaWVzTm9kZS5ub2RlTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgICAgIGJvdW5kYXJpZXNOb2RlID0gcG9wcGVyLm93bmVyRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYm91bmRhcmllc0VsZW1lbnQgPT09ICd3aW5kb3cnKSB7XG4gICAgICBib3VuZGFyaWVzTm9kZSA9IHBvcHBlci5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgYm91bmRhcmllc05vZGUgPSBib3VuZGFyaWVzRWxlbWVudDtcbiAgICB9XG5cbiAgICB2YXIgb2Zmc2V0cyA9IGdldE9mZnNldFJlY3RSZWxhdGl2ZVRvQXJiaXRyYXJ5Tm9kZShib3VuZGFyaWVzTm9kZSwgb2Zmc2V0UGFyZW50LCBmaXhlZFBvc2l0aW9uKTtcblxuICAgIC8vIEluIGNhc2Ugb2YgSFRNTCwgd2UgbmVlZCBhIGRpZmZlcmVudCBjb21wdXRhdGlvblxuICAgIGlmIChib3VuZGFyaWVzTm9kZS5ub2RlTmFtZSA9PT0gJ0hUTUwnICYmICFpc0ZpeGVkKG9mZnNldFBhcmVudCkpIHtcbiAgICAgIHZhciBfZ2V0V2luZG93U2l6ZXMgPSBnZXRXaW5kb3dTaXplcyhwb3BwZXIub3duZXJEb2N1bWVudCksXG4gICAgICAgICAgaGVpZ2h0ID0gX2dldFdpbmRvd1NpemVzLmhlaWdodCxcbiAgICAgICAgICB3aWR0aCA9IF9nZXRXaW5kb3dTaXplcy53aWR0aDtcblxuICAgICAgYm91bmRhcmllcy50b3AgKz0gb2Zmc2V0cy50b3AgLSBvZmZzZXRzLm1hcmdpblRvcDtcbiAgICAgIGJvdW5kYXJpZXMuYm90dG9tID0gaGVpZ2h0ICsgb2Zmc2V0cy50b3A7XG4gICAgICBib3VuZGFyaWVzLmxlZnQgKz0gb2Zmc2V0cy5sZWZ0IC0gb2Zmc2V0cy5tYXJnaW5MZWZ0O1xuICAgICAgYm91bmRhcmllcy5yaWdodCA9IHdpZHRoICsgb2Zmc2V0cy5sZWZ0O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBmb3IgYWxsIHRoZSBvdGhlciBET00gZWxlbWVudHMsIHRoaXMgb25lIGlzIGdvb2RcbiAgICAgIGJvdW5kYXJpZXMgPSBvZmZzZXRzO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFkZCBwYWRkaW5nc1xuICBwYWRkaW5nID0gcGFkZGluZyB8fCAwO1xuICB2YXIgaXNQYWRkaW5nTnVtYmVyID0gdHlwZW9mIHBhZGRpbmcgPT09ICdudW1iZXInO1xuICBib3VuZGFyaWVzLmxlZnQgKz0gaXNQYWRkaW5nTnVtYmVyID8gcGFkZGluZyA6IHBhZGRpbmcubGVmdCB8fCAwO1xuICBib3VuZGFyaWVzLnRvcCArPSBpc1BhZGRpbmdOdW1iZXIgPyBwYWRkaW5nIDogcGFkZGluZy50b3AgfHwgMDtcbiAgYm91bmRhcmllcy5yaWdodCAtPSBpc1BhZGRpbmdOdW1iZXIgPyBwYWRkaW5nIDogcGFkZGluZy5yaWdodCB8fCAwO1xuICBib3VuZGFyaWVzLmJvdHRvbSAtPSBpc1BhZGRpbmdOdW1iZXIgPyBwYWRkaW5nIDogcGFkZGluZy5ib3R0b20gfHwgMDtcblxuICByZXR1cm4gYm91bmRhcmllcztcbn1cblxuZnVuY3Rpb24gZ2V0QXJlYShfcmVmKSB7XG4gIHZhciB3aWR0aCA9IF9yZWYud2lkdGgsXG4gICAgICBoZWlnaHQgPSBfcmVmLmhlaWdodDtcblxuICByZXR1cm4gd2lkdGggKiBoZWlnaHQ7XG59XG5cbi8qKlxuICogVXRpbGl0eSB1c2VkIHRvIHRyYW5zZm9ybSB0aGUgYGF1dG9gIHBsYWNlbWVudCB0byB0aGUgcGxhY2VtZW50IHdpdGggbW9yZVxuICogYXZhaWxhYmxlIHNwYWNlLlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gY29tcHV0ZUF1dG9QbGFjZW1lbnQocGxhY2VtZW50LCByZWZSZWN0LCBwb3BwZXIsIHJlZmVyZW5jZSwgYm91bmRhcmllc0VsZW1lbnQpIHtcbiAgdmFyIHBhZGRpbmcgPSBhcmd1bWVudHMubGVuZ3RoID4gNSAmJiBhcmd1bWVudHNbNV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1s1XSA6IDA7XG5cbiAgaWYgKHBsYWNlbWVudC5pbmRleE9mKCdhdXRvJykgPT09IC0xKSB7XG4gICAgcmV0dXJuIHBsYWNlbWVudDtcbiAgfVxuXG4gIHZhciBib3VuZGFyaWVzID0gZ2V0Qm91bmRhcmllcyhwb3BwZXIsIHJlZmVyZW5jZSwgcGFkZGluZywgYm91bmRhcmllc0VsZW1lbnQpO1xuXG4gIHZhciByZWN0cyA9IHtcbiAgICB0b3A6IHtcbiAgICAgIHdpZHRoOiBib3VuZGFyaWVzLndpZHRoLFxuICAgICAgaGVpZ2h0OiByZWZSZWN0LnRvcCAtIGJvdW5kYXJpZXMudG9wXG4gICAgfSxcbiAgICByaWdodDoge1xuICAgICAgd2lkdGg6IGJvdW5kYXJpZXMucmlnaHQgLSByZWZSZWN0LnJpZ2h0LFxuICAgICAgaGVpZ2h0OiBib3VuZGFyaWVzLmhlaWdodFxuICAgIH0sXG4gICAgYm90dG9tOiB7XG4gICAgICB3aWR0aDogYm91bmRhcmllcy53aWR0aCxcbiAgICAgIGhlaWdodDogYm91bmRhcmllcy5ib3R0b20gLSByZWZSZWN0LmJvdHRvbVxuICAgIH0sXG4gICAgbGVmdDoge1xuICAgICAgd2lkdGg6IHJlZlJlY3QubGVmdCAtIGJvdW5kYXJpZXMubGVmdCxcbiAgICAgIGhlaWdodDogYm91bmRhcmllcy5oZWlnaHRcbiAgICB9XG4gIH07XG5cbiAgdmFyIHNvcnRlZEFyZWFzID0gT2JqZWN0LmtleXMocmVjdHMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgcmV0dXJuIF9leHRlbmRzKHtcbiAgICAgIGtleToga2V5XG4gICAgfSwgcmVjdHNba2V5XSwge1xuICAgICAgYXJlYTogZ2V0QXJlYShyZWN0c1trZXldKVxuICAgIH0pO1xuICB9KS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIGIuYXJlYSAtIGEuYXJlYTtcbiAgfSk7XG5cbiAgdmFyIGZpbHRlcmVkQXJlYXMgPSBzb3J0ZWRBcmVhcy5maWx0ZXIoZnVuY3Rpb24gKF9yZWYyKSB7XG4gICAgdmFyIHdpZHRoID0gX3JlZjIud2lkdGgsXG4gICAgICAgIGhlaWdodCA9IF9yZWYyLmhlaWdodDtcbiAgICByZXR1cm4gd2lkdGggPj0gcG9wcGVyLmNsaWVudFdpZHRoICYmIGhlaWdodCA+PSBwb3BwZXIuY2xpZW50SGVpZ2h0O1xuICB9KTtcblxuICB2YXIgY29tcHV0ZWRQbGFjZW1lbnQgPSBmaWx0ZXJlZEFyZWFzLmxlbmd0aCA+IDAgPyBmaWx0ZXJlZEFyZWFzWzBdLmtleSA6IHNvcnRlZEFyZWFzWzBdLmtleTtcblxuICB2YXIgdmFyaWF0aW9uID0gcGxhY2VtZW50LnNwbGl0KCctJylbMV07XG5cbiAgcmV0dXJuIGNvbXB1dGVkUGxhY2VtZW50ICsgKHZhcmlhdGlvbiA/ICctJyArIHZhcmlhdGlvbiA6ICcnKTtcbn1cblxuLyoqXG4gKiBHZXQgb2Zmc2V0cyB0byB0aGUgcmVmZXJlbmNlIGVsZW1lbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZVxuICogQHBhcmFtIHtFbGVtZW50fSBwb3BwZXIgLSB0aGUgcG9wcGVyIGVsZW1lbnRcbiAqIEBwYXJhbSB7RWxlbWVudH0gcmVmZXJlbmNlIC0gdGhlIHJlZmVyZW5jZSBlbGVtZW50ICh0aGUgcG9wcGVyIHdpbGwgYmUgcmVsYXRpdmUgdG8gdGhpcylcbiAqIEBwYXJhbSB7RWxlbWVudH0gZml4ZWRQb3NpdGlvbiAtIGlzIGluIGZpeGVkIHBvc2l0aW9uIG1vZGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBvZmZzZXRzIHdoaWNoIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyXG4gKi9cbmZ1bmN0aW9uIGdldFJlZmVyZW5jZU9mZnNldHMoc3RhdGUsIHBvcHBlciwgcmVmZXJlbmNlKSB7XG4gIHZhciBmaXhlZFBvc2l0aW9uID0gYXJndW1lbnRzLmxlbmd0aCA+IDMgJiYgYXJndW1lbnRzWzNdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbM10gOiBudWxsO1xuXG4gIHZhciBjb21tb25PZmZzZXRQYXJlbnQgPSBmaXhlZFBvc2l0aW9uID8gZ2V0Rml4ZWRQb3NpdGlvbk9mZnNldFBhcmVudChwb3BwZXIpIDogZmluZENvbW1vbk9mZnNldFBhcmVudChwb3BwZXIsIHJlZmVyZW5jZSk7XG4gIHJldHVybiBnZXRPZmZzZXRSZWN0UmVsYXRpdmVUb0FyYml0cmFyeU5vZGUocmVmZXJlbmNlLCBjb21tb25PZmZzZXRQYXJlbnQsIGZpeGVkUG9zaXRpb24pO1xufVxuXG4vKipcbiAqIEdldCB0aGUgb3V0ZXIgc2l6ZXMgb2YgdGhlIGdpdmVuIGVsZW1lbnQgKG9mZnNldCBzaXplICsgbWFyZ2lucylcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge09iamVjdH0gb2JqZWN0IGNvbnRhaW5pbmcgd2lkdGggYW5kIGhlaWdodCBwcm9wZXJ0aWVzXG4gKi9cbmZ1bmN0aW9uIGdldE91dGVyU2l6ZXMoZWxlbWVudCkge1xuICB2YXIgc3R5bGVzID0gZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KTtcbiAgdmFyIHggPSBwYXJzZUZsb2F0KHN0eWxlcy5tYXJnaW5Ub3ApICsgcGFyc2VGbG9hdChzdHlsZXMubWFyZ2luQm90dG9tKTtcbiAgdmFyIHkgPSBwYXJzZUZsb2F0KHN0eWxlcy5tYXJnaW5MZWZ0KSArIHBhcnNlRmxvYXQoc3R5bGVzLm1hcmdpblJpZ2h0KTtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICB3aWR0aDogZWxlbWVudC5vZmZzZXRXaWR0aCArIHksXG4gICAgaGVpZ2h0OiBlbGVtZW50Lm9mZnNldEhlaWdodCArIHhcbiAgfTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIG9wcG9zaXRlIHBsYWNlbWVudCBvZiB0aGUgZ2l2ZW4gb25lXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge1N0cmluZ30gcGxhY2VtZW50XG4gKiBAcmV0dXJucyB7U3RyaW5nfSBmbGlwcGVkIHBsYWNlbWVudFxuICovXG5mdW5jdGlvbiBnZXRPcHBvc2l0ZVBsYWNlbWVudChwbGFjZW1lbnQpIHtcbiAgdmFyIGhhc2ggPSB7IGxlZnQ6ICdyaWdodCcsIHJpZ2h0OiAnbGVmdCcsIGJvdHRvbTogJ3RvcCcsIHRvcDogJ2JvdHRvbScgfTtcbiAgcmV0dXJuIHBsYWNlbWVudC5yZXBsYWNlKC9sZWZ0fHJpZ2h0fGJvdHRvbXx0b3AvZywgZnVuY3Rpb24gKG1hdGNoZWQpIHtcbiAgICByZXR1cm4gaGFzaFttYXRjaGVkXTtcbiAgfSk7XG59XG5cbi8qKlxuICogR2V0IG9mZnNldHMgdG8gdGhlIHBvcHBlclxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHBhcmFtIHtPYmplY3R9IHBvc2l0aW9uIC0gQ1NTIHBvc2l0aW9uIHRoZSBQb3BwZXIgd2lsbCBnZXQgYXBwbGllZFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcG9wcGVyIC0gdGhlIHBvcHBlciBlbGVtZW50XG4gKiBAcGFyYW0ge09iamVjdH0gcmVmZXJlbmNlT2Zmc2V0cyAtIHRoZSByZWZlcmVuY2Ugb2Zmc2V0cyAodGhlIHBvcHBlciB3aWxsIGJlIHJlbGF0aXZlIHRvIHRoaXMpXG4gKiBAcGFyYW0ge1N0cmluZ30gcGxhY2VtZW50IC0gb25lIG9mIHRoZSB2YWxpZCBwbGFjZW1lbnQgb3B0aW9uc1xuICogQHJldHVybnMge09iamVjdH0gcG9wcGVyT2Zmc2V0cyAtIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBvZmZzZXRzIHdoaWNoIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyXG4gKi9cbmZ1bmN0aW9uIGdldFBvcHBlck9mZnNldHMocG9wcGVyLCByZWZlcmVuY2VPZmZzZXRzLCBwbGFjZW1lbnQpIHtcbiAgcGxhY2VtZW50ID0gcGxhY2VtZW50LnNwbGl0KCctJylbMF07XG5cbiAgLy8gR2V0IHBvcHBlciBub2RlIHNpemVzXG4gIHZhciBwb3BwZXJSZWN0ID0gZ2V0T3V0ZXJTaXplcyhwb3BwZXIpO1xuXG4gIC8vIEFkZCBwb3NpdGlvbiwgd2lkdGggYW5kIGhlaWdodCB0byBvdXIgb2Zmc2V0cyBvYmplY3RcbiAgdmFyIHBvcHBlck9mZnNldHMgPSB7XG4gICAgd2lkdGg6IHBvcHBlclJlY3Qud2lkdGgsXG4gICAgaGVpZ2h0OiBwb3BwZXJSZWN0LmhlaWdodFxuICB9O1xuXG4gIC8vIGRlcGVuZGluZyBieSB0aGUgcG9wcGVyIHBsYWNlbWVudCB3ZSBoYXZlIHRvIGNvbXB1dGUgaXRzIG9mZnNldHMgc2xpZ2h0bHkgZGlmZmVyZW50bHlcbiAgdmFyIGlzSG9yaXogPSBbJ3JpZ2h0JywgJ2xlZnQnXS5pbmRleE9mKHBsYWNlbWVudCkgIT09IC0xO1xuICB2YXIgbWFpblNpZGUgPSBpc0hvcml6ID8gJ3RvcCcgOiAnbGVmdCc7XG4gIHZhciBzZWNvbmRhcnlTaWRlID0gaXNIb3JpeiA/ICdsZWZ0JyA6ICd0b3AnO1xuICB2YXIgbWVhc3VyZW1lbnQgPSBpc0hvcml6ID8gJ2hlaWdodCcgOiAnd2lkdGgnO1xuICB2YXIgc2Vjb25kYXJ5TWVhc3VyZW1lbnQgPSAhaXNIb3JpeiA/ICdoZWlnaHQnIDogJ3dpZHRoJztcblxuICBwb3BwZXJPZmZzZXRzW21haW5TaWRlXSA9IHJlZmVyZW5jZU9mZnNldHNbbWFpblNpZGVdICsgcmVmZXJlbmNlT2Zmc2V0c1ttZWFzdXJlbWVudF0gLyAyIC0gcG9wcGVyUmVjdFttZWFzdXJlbWVudF0gLyAyO1xuICBpZiAocGxhY2VtZW50ID09PSBzZWNvbmRhcnlTaWRlKSB7XG4gICAgcG9wcGVyT2Zmc2V0c1tzZWNvbmRhcnlTaWRlXSA9IHJlZmVyZW5jZU9mZnNldHNbc2Vjb25kYXJ5U2lkZV0gLSBwb3BwZXJSZWN0W3NlY29uZGFyeU1lYXN1cmVtZW50XTtcbiAgfSBlbHNlIHtcbiAgICBwb3BwZXJPZmZzZXRzW3NlY29uZGFyeVNpZGVdID0gcmVmZXJlbmNlT2Zmc2V0c1tnZXRPcHBvc2l0ZVBsYWNlbWVudChzZWNvbmRhcnlTaWRlKV07XG4gIH1cblxuICByZXR1cm4gcG9wcGVyT2Zmc2V0cztcbn1cblxuLyoqXG4gKiBNaW1pY3MgdGhlIGBmaW5kYCBtZXRob2Qgb2YgQXJyYXlcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7QXJyYXl9IGFyclxuICogQGFyZ3VtZW50IHByb3BcbiAqIEBhcmd1bWVudCB2YWx1ZVxuICogQHJldHVybnMgaW5kZXggb3IgLTFcbiAqL1xuZnVuY3Rpb24gZmluZChhcnIsIGNoZWNrKSB7XG4gIC8vIHVzZSBuYXRpdmUgZmluZCBpZiBzdXBwb3J0ZWRcbiAgaWYgKEFycmF5LnByb3RvdHlwZS5maW5kKSB7XG4gICAgcmV0dXJuIGFyci5maW5kKGNoZWNrKTtcbiAgfVxuXG4gIC8vIHVzZSBgZmlsdGVyYCB0byBvYnRhaW4gdGhlIHNhbWUgYmVoYXZpb3Igb2YgYGZpbmRgXG4gIHJldHVybiBhcnIuZmlsdGVyKGNoZWNrKVswXTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIGluZGV4IG9mIHRoZSBtYXRjaGluZyBvYmplY3RcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7QXJyYXl9IGFyclxuICogQGFyZ3VtZW50IHByb3BcbiAqIEBhcmd1bWVudCB2YWx1ZVxuICogQHJldHVybnMgaW5kZXggb3IgLTFcbiAqL1xuZnVuY3Rpb24gZmluZEluZGV4KGFyciwgcHJvcCwgdmFsdWUpIHtcbiAgLy8gdXNlIG5hdGl2ZSBmaW5kSW5kZXggaWYgc3VwcG9ydGVkXG4gIGlmIChBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KSB7XG4gICAgcmV0dXJuIGFyci5maW5kSW5kZXgoZnVuY3Rpb24gKGN1cikge1xuICAgICAgcmV0dXJuIGN1cltwcm9wXSA9PT0gdmFsdWU7XG4gICAgfSk7XG4gIH1cblxuICAvLyB1c2UgYGZpbmRgICsgYGluZGV4T2ZgIGlmIGBmaW5kSW5kZXhgIGlzbid0IHN1cHBvcnRlZFxuICB2YXIgbWF0Y2ggPSBmaW5kKGFyciwgZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiBvYmpbcHJvcF0gPT09IHZhbHVlO1xuICB9KTtcbiAgcmV0dXJuIGFyci5pbmRleE9mKG1hdGNoKTtcbn1cblxuLyoqXG4gKiBMb29wIHRyb3VnaCB0aGUgbGlzdCBvZiBtb2RpZmllcnMgYW5kIHJ1biB0aGVtIGluIG9yZGVyLFxuICogZWFjaCBvZiB0aGVtIHdpbGwgdGhlbiBlZGl0IHRoZSBkYXRhIG9iamVjdC5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7ZGF0YU9iamVjdH0gZGF0YVxuICogQHBhcmFtIHtBcnJheX0gbW9kaWZpZXJzXG4gKiBAcGFyYW0ge1N0cmluZ30gZW5kcyAtIE9wdGlvbmFsIG1vZGlmaWVyIG5hbWUgdXNlZCBhcyBzdG9wcGVyXG4gKiBAcmV0dXJucyB7ZGF0YU9iamVjdH1cbiAqL1xuZnVuY3Rpb24gcnVuTW9kaWZpZXJzKG1vZGlmaWVycywgZGF0YSwgZW5kcykge1xuICB2YXIgbW9kaWZpZXJzVG9SdW4gPSBlbmRzID09PSB1bmRlZmluZWQgPyBtb2RpZmllcnMgOiBtb2RpZmllcnMuc2xpY2UoMCwgZmluZEluZGV4KG1vZGlmaWVycywgJ25hbWUnLCBlbmRzKSk7XG5cbiAgbW9kaWZpZXJzVG9SdW4uZm9yRWFjaChmdW5jdGlvbiAobW9kaWZpZXIpIHtcbiAgICBpZiAobW9kaWZpZXJbJ2Z1bmN0aW9uJ10pIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZG90LW5vdGF0aW9uXG4gICAgICBjb25zb2xlLndhcm4oJ2Btb2RpZmllci5mdW5jdGlvbmAgaXMgZGVwcmVjYXRlZCwgdXNlIGBtb2RpZmllci5mbmAhJyk7XG4gICAgfVxuICAgIHZhciBmbiA9IG1vZGlmaWVyWydmdW5jdGlvbiddIHx8IG1vZGlmaWVyLmZuOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGRvdC1ub3RhdGlvblxuICAgIGlmIChtb2RpZmllci5lbmFibGVkICYmIGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAvLyBBZGQgcHJvcGVydGllcyB0byBvZmZzZXRzIHRvIG1ha2UgdGhlbSBhIGNvbXBsZXRlIGNsaWVudFJlY3Qgb2JqZWN0XG4gICAgICAvLyB3ZSBkbyB0aGlzIGJlZm9yZSBlYWNoIG1vZGlmaWVyIHRvIG1ha2Ugc3VyZSB0aGUgcHJldmlvdXMgb25lIGRvZXNuJ3RcbiAgICAgIC8vIG1lc3Mgd2l0aCB0aGVzZSB2YWx1ZXNcbiAgICAgIGRhdGEub2Zmc2V0cy5wb3BwZXIgPSBnZXRDbGllbnRSZWN0KGRhdGEub2Zmc2V0cy5wb3BwZXIpO1xuICAgICAgZGF0YS5vZmZzZXRzLnJlZmVyZW5jZSA9IGdldENsaWVudFJlY3QoZGF0YS5vZmZzZXRzLnJlZmVyZW5jZSk7XG5cbiAgICAgIGRhdGEgPSBmbihkYXRhLCBtb2RpZmllcik7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBwb3NpdGlvbiBvZiB0aGUgcG9wcGVyLCBjb21wdXRpbmcgdGhlIG5ldyBvZmZzZXRzIGFuZCBhcHBseWluZ1xuICogdGhlIG5ldyBzdHlsZS48YnIgLz5cbiAqIFByZWZlciBgc2NoZWR1bGVVcGRhdGVgIG92ZXIgYHVwZGF0ZWAgYmVjYXVzZSBvZiBwZXJmb3JtYW5jZSByZWFzb25zLlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlclxuICovXG5mdW5jdGlvbiB1cGRhdGUoKSB7XG4gIC8vIGlmIHBvcHBlciBpcyBkZXN0cm95ZWQsIGRvbid0IHBlcmZvcm0gYW55IGZ1cnRoZXIgdXBkYXRlXG4gIGlmICh0aGlzLnN0YXRlLmlzRGVzdHJveWVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGRhdGEgPSB7XG4gICAgaW5zdGFuY2U6IHRoaXMsXG4gICAgc3R5bGVzOiB7fSxcbiAgICBhcnJvd1N0eWxlczoge30sXG4gICAgYXR0cmlidXRlczoge30sXG4gICAgZmxpcHBlZDogZmFsc2UsXG4gICAgb2Zmc2V0czoge31cbiAgfTtcblxuICAvLyBjb21wdXRlIHJlZmVyZW5jZSBlbGVtZW50IG9mZnNldHNcbiAgZGF0YS5vZmZzZXRzLnJlZmVyZW5jZSA9IGdldFJlZmVyZW5jZU9mZnNldHModGhpcy5zdGF0ZSwgdGhpcy5wb3BwZXIsIHRoaXMucmVmZXJlbmNlLCB0aGlzLm9wdGlvbnMucG9zaXRpb25GaXhlZCk7XG5cbiAgLy8gY29tcHV0ZSBhdXRvIHBsYWNlbWVudCwgc3RvcmUgcGxhY2VtZW50IGluc2lkZSB0aGUgZGF0YSBvYmplY3QsXG4gIC8vIG1vZGlmaWVycyB3aWxsIGJlIGFibGUgdG8gZWRpdCBgcGxhY2VtZW50YCBpZiBuZWVkZWRcbiAgLy8gYW5kIHJlZmVyIHRvIG9yaWdpbmFsUGxhY2VtZW50IHRvIGtub3cgdGhlIG9yaWdpbmFsIHZhbHVlXG4gIGRhdGEucGxhY2VtZW50ID0gY29tcHV0ZUF1dG9QbGFjZW1lbnQodGhpcy5vcHRpb25zLnBsYWNlbWVudCwgZGF0YS5vZmZzZXRzLnJlZmVyZW5jZSwgdGhpcy5wb3BwZXIsIHRoaXMucmVmZXJlbmNlLCB0aGlzLm9wdGlvbnMubW9kaWZpZXJzLmZsaXAuYm91bmRhcmllc0VsZW1lbnQsIHRoaXMub3B0aW9ucy5tb2RpZmllcnMuZmxpcC5wYWRkaW5nKTtcblxuICAvLyBzdG9yZSB0aGUgY29tcHV0ZWQgcGxhY2VtZW50IGluc2lkZSBgb3JpZ2luYWxQbGFjZW1lbnRgXG4gIGRhdGEub3JpZ2luYWxQbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudDtcblxuICBkYXRhLnBvc2l0aW9uRml4ZWQgPSB0aGlzLm9wdGlvbnMucG9zaXRpb25GaXhlZDtcblxuICAvLyBjb21wdXRlIHRoZSBwb3BwZXIgb2Zmc2V0c1xuICBkYXRhLm9mZnNldHMucG9wcGVyID0gZ2V0UG9wcGVyT2Zmc2V0cyh0aGlzLnBvcHBlciwgZGF0YS5vZmZzZXRzLnJlZmVyZW5jZSwgZGF0YS5wbGFjZW1lbnQpO1xuXG4gIGRhdGEub2Zmc2V0cy5wb3BwZXIucG9zaXRpb24gPSB0aGlzLm9wdGlvbnMucG9zaXRpb25GaXhlZCA/ICdmaXhlZCcgOiAnYWJzb2x1dGUnO1xuXG4gIC8vIHJ1biB0aGUgbW9kaWZpZXJzXG4gIGRhdGEgPSBydW5Nb2RpZmllcnModGhpcy5tb2RpZmllcnMsIGRhdGEpO1xuXG4gIC8vIHRoZSBmaXJzdCBgdXBkYXRlYCB3aWxsIGNhbGwgYG9uQ3JlYXRlYCBjYWxsYmFja1xuICAvLyB0aGUgb3RoZXIgb25lcyB3aWxsIGNhbGwgYG9uVXBkYXRlYCBjYWxsYmFja1xuICBpZiAoIXRoaXMuc3RhdGUuaXNDcmVhdGVkKSB7XG4gICAgdGhpcy5zdGF0ZS5pc0NyZWF0ZWQgPSB0cnVlO1xuICAgIHRoaXMub3B0aW9ucy5vbkNyZWF0ZShkYXRhKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm9wdGlvbnMub25VcGRhdGUoZGF0YSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIZWxwZXIgdXNlZCB0byBrbm93IGlmIHRoZSBnaXZlbiBtb2RpZmllciBpcyBlbmFibGVkLlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTW9kaWZpZXJFbmFibGVkKG1vZGlmaWVycywgbW9kaWZpZXJOYW1lKSB7XG4gIHJldHVybiBtb2RpZmllcnMuc29tZShmdW5jdGlvbiAoX3JlZikge1xuICAgIHZhciBuYW1lID0gX3JlZi5uYW1lLFxuICAgICAgICBlbmFibGVkID0gX3JlZi5lbmFibGVkO1xuICAgIHJldHVybiBlbmFibGVkICYmIG5hbWUgPT09IG1vZGlmaWVyTmFtZTtcbiAgfSk7XG59XG5cbi8qKlxuICogR2V0IHRoZSBwcmVmaXhlZCBzdXBwb3J0ZWQgcHJvcGVydHkgbmFtZVxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtTdHJpbmd9IHByb3BlcnR5IChjYW1lbENhc2UpXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBwcmVmaXhlZCBwcm9wZXJ0eSAoY2FtZWxDYXNlIG9yIFBhc2NhbENhc2UsIGRlcGVuZGluZyBvbiB0aGUgdmVuZG9yIHByZWZpeClcbiAqL1xuZnVuY3Rpb24gZ2V0U3VwcG9ydGVkUHJvcGVydHlOYW1lKHByb3BlcnR5KSB7XG4gIHZhciBwcmVmaXhlcyA9IFtmYWxzZSwgJ21zJywgJ1dlYmtpdCcsICdNb3onLCAnTyddO1xuICB2YXIgdXBwZXJQcm9wID0gcHJvcGVydHkuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwcm9wZXJ0eS5zbGljZSgxKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHByZWZpeGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHByZWZpeCA9IHByZWZpeGVzW2ldO1xuICAgIHZhciB0b0NoZWNrID0gcHJlZml4ID8gJycgKyBwcmVmaXggKyB1cHBlclByb3AgOiBwcm9wZXJ0eTtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmJvZHkuc3R5bGVbdG9DaGVja10gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdG9DaGVjaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogRGVzdHJveXMgdGhlIHBvcHBlci5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXJcbiAqL1xuZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgdGhpcy5zdGF0ZS5pc0Rlc3Ryb3llZCA9IHRydWU7XG5cbiAgLy8gdG91Y2ggRE9NIG9ubHkgaWYgYGFwcGx5U3R5bGVgIG1vZGlmaWVyIGlzIGVuYWJsZWRcbiAgaWYgKGlzTW9kaWZpZXJFbmFibGVkKHRoaXMubW9kaWZpZXJzLCAnYXBwbHlTdHlsZScpKSB7XG4gICAgdGhpcy5wb3BwZXIucmVtb3ZlQXR0cmlidXRlKCd4LXBsYWNlbWVudCcpO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLnBvc2l0aW9uID0gJyc7XG4gICAgdGhpcy5wb3BwZXIuc3R5bGUudG9wID0gJyc7XG4gICAgdGhpcy5wb3BwZXIuc3R5bGUubGVmdCA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLnJpZ2h0ID0gJyc7XG4gICAgdGhpcy5wb3BwZXIuc3R5bGUuYm90dG9tID0gJyc7XG4gICAgdGhpcy5wb3BwZXIuc3R5bGUud2lsbENoYW5nZSA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlW2dldFN1cHBvcnRlZFByb3BlcnR5TmFtZSgndHJhbnNmb3JtJyldID0gJyc7XG4gIH1cblxuICB0aGlzLmRpc2FibGVFdmVudExpc3RlbmVycygpO1xuXG4gIC8vIHJlbW92ZSB0aGUgcG9wcGVyIGlmIHVzZXIgZXhwbGljaXR5IGFza2VkIGZvciB0aGUgZGVsZXRpb24gb24gZGVzdHJveVxuICAvLyBkbyBub3QgdXNlIGByZW1vdmVgIGJlY2F1c2UgSUUxMSBkb2Vzbid0IHN1cHBvcnQgaXRcbiAgaWYgKHRoaXMub3B0aW9ucy5yZW1vdmVPbkRlc3Ryb3kpIHtcbiAgICB0aGlzLnBvcHBlci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMucG9wcGVyKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHdpbmRvdyBhc3NvY2lhdGVkIHdpdGggdGhlIGVsZW1lbnRcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge1dpbmRvd31cbiAqL1xuZnVuY3Rpb24gZ2V0V2luZG93KGVsZW1lbnQpIHtcbiAgdmFyIG93bmVyRG9jdW1lbnQgPSBlbGVtZW50Lm93bmVyRG9jdW1lbnQ7XG4gIHJldHVybiBvd25lckRvY3VtZW50ID8gb3duZXJEb2N1bWVudC5kZWZhdWx0VmlldyA6IHdpbmRvdztcbn1cblxuZnVuY3Rpb24gYXR0YWNoVG9TY3JvbGxQYXJlbnRzKHNjcm9sbFBhcmVudCwgZXZlbnQsIGNhbGxiYWNrLCBzY3JvbGxQYXJlbnRzKSB7XG4gIHZhciBpc0JvZHkgPSBzY3JvbGxQYXJlbnQubm9kZU5hbWUgPT09ICdCT0RZJztcbiAgdmFyIHRhcmdldCA9IGlzQm9keSA/IHNjcm9sbFBhcmVudC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3IDogc2Nyb2xsUGFyZW50O1xuICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgY2FsbGJhY2ssIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcblxuICBpZiAoIWlzQm9keSkge1xuICAgIGF0dGFjaFRvU2Nyb2xsUGFyZW50cyhnZXRTY3JvbGxQYXJlbnQodGFyZ2V0LnBhcmVudE5vZGUpLCBldmVudCwgY2FsbGJhY2ssIHNjcm9sbFBhcmVudHMpO1xuICB9XG4gIHNjcm9sbFBhcmVudHMucHVzaCh0YXJnZXQpO1xufVxuXG4vKipcbiAqIFNldHVwIG5lZWRlZCBldmVudCBsaXN0ZW5lcnMgdXNlZCB0byB1cGRhdGUgdGhlIHBvcHBlciBwb3NpdGlvblxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gc2V0dXBFdmVudExpc3RlbmVycyhyZWZlcmVuY2UsIG9wdGlvbnMsIHN0YXRlLCB1cGRhdGVCb3VuZCkge1xuICAvLyBSZXNpemUgZXZlbnQgbGlzdGVuZXIgb24gd2luZG93XG4gIHN0YXRlLnVwZGF0ZUJvdW5kID0gdXBkYXRlQm91bmQ7XG4gIGdldFdpbmRvdyhyZWZlcmVuY2UpLmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHN0YXRlLnVwZGF0ZUJvdW5kLCB7IHBhc3NpdmU6IHRydWUgfSk7XG5cbiAgLy8gU2Nyb2xsIGV2ZW50IGxpc3RlbmVyIG9uIHNjcm9sbCBwYXJlbnRzXG4gIHZhciBzY3JvbGxFbGVtZW50ID0gZ2V0U2Nyb2xsUGFyZW50KHJlZmVyZW5jZSk7XG4gIGF0dGFjaFRvU2Nyb2xsUGFyZW50cyhzY3JvbGxFbGVtZW50LCAnc2Nyb2xsJywgc3RhdGUudXBkYXRlQm91bmQsIHN0YXRlLnNjcm9sbFBhcmVudHMpO1xuICBzdGF0ZS5zY3JvbGxFbGVtZW50ID0gc2Nyb2xsRWxlbWVudDtcbiAgc3RhdGUuZXZlbnRzRW5hYmxlZCA9IHRydWU7XG5cbiAgcmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEl0IHdpbGwgYWRkIHJlc2l6ZS9zY3JvbGwgZXZlbnRzIGFuZCBzdGFydCByZWNhbGN1bGF0aW5nXG4gKiBwb3NpdGlvbiBvZiB0aGUgcG9wcGVyIGVsZW1lbnQgd2hlbiB0aGV5IGFyZSB0cmlnZ2VyZWQuXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyXG4gKi9cbmZ1bmN0aW9uIGVuYWJsZUV2ZW50TGlzdGVuZXJzKCkge1xuICBpZiAoIXRoaXMuc3RhdGUuZXZlbnRzRW5hYmxlZCkge1xuICAgIHRoaXMuc3RhdGUgPSBzZXR1cEV2ZW50TGlzdGVuZXJzKHRoaXMucmVmZXJlbmNlLCB0aGlzLm9wdGlvbnMsIHRoaXMuc3RhdGUsIHRoaXMuc2NoZWR1bGVVcGRhdGUpO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVycyB1c2VkIHRvIHVwZGF0ZSB0aGUgcG9wcGVyIHBvc2l0aW9uXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiByZW1vdmVFdmVudExpc3RlbmVycyhyZWZlcmVuY2UsIHN0YXRlKSB7XG4gIC8vIFJlbW92ZSByZXNpemUgZXZlbnQgbGlzdGVuZXIgb24gd2luZG93XG4gIGdldFdpbmRvdyhyZWZlcmVuY2UpLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHN0YXRlLnVwZGF0ZUJvdW5kKTtcblxuICAvLyBSZW1vdmUgc2Nyb2xsIGV2ZW50IGxpc3RlbmVyIG9uIHNjcm9sbCBwYXJlbnRzXG4gIHN0YXRlLnNjcm9sbFBhcmVudHMuZm9yRWFjaChmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgdGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHN0YXRlLnVwZGF0ZUJvdW5kKTtcbiAgfSk7XG5cbiAgLy8gUmVzZXQgc3RhdGVcbiAgc3RhdGUudXBkYXRlQm91bmQgPSBudWxsO1xuICBzdGF0ZS5zY3JvbGxQYXJlbnRzID0gW107XG4gIHN0YXRlLnNjcm9sbEVsZW1lbnQgPSBudWxsO1xuICBzdGF0ZS5ldmVudHNFbmFibGVkID0gZmFsc2U7XG4gIHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBJdCB3aWxsIHJlbW92ZSByZXNpemUvc2Nyb2xsIGV2ZW50cyBhbmQgd29uJ3QgcmVjYWxjdWxhdGUgcG9wcGVyIHBvc2l0aW9uXG4gKiB3aGVuIHRoZXkgYXJlIHRyaWdnZXJlZC4gSXQgYWxzbyB3b24ndCB0cmlnZ2VyIGBvblVwZGF0ZWAgY2FsbGJhY2sgYW55bW9yZSxcbiAqIHVubGVzcyB5b3UgY2FsbCBgdXBkYXRlYCBtZXRob2QgbWFudWFsbHkuXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyXG4gKi9cbmZ1bmN0aW9uIGRpc2FibGVFdmVudExpc3RlbmVycygpIHtcbiAgaWYgKHRoaXMuc3RhdGUuZXZlbnRzRW5hYmxlZCkge1xuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuc2NoZWR1bGVVcGRhdGUpO1xuICAgIHRoaXMuc3RhdGUgPSByZW1vdmVFdmVudExpc3RlbmVycyh0aGlzLnJlZmVyZW5jZSwgdGhpcy5zdGF0ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBUZWxscyBpZiBhIGdpdmVuIGlucHV0IGlzIGEgbnVtYmVyXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0geyp9IGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc051bWVyaWMobikge1xuICByZXR1cm4gbiAhPT0gJycgJiYgIWlzTmFOKHBhcnNlRmxvYXQobikpICYmIGlzRmluaXRlKG4pO1xufVxuXG4vKipcbiAqIFNldCB0aGUgc3R5bGUgdG8gdGhlIGdpdmVuIHBvcHBlclxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFbGVtZW50fSBlbGVtZW50IC0gRWxlbWVudCB0byBhcHBseSB0aGUgc3R5bGUgdG9cbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBzdHlsZXNcbiAqIE9iamVjdCB3aXRoIGEgbGlzdCBvZiBwcm9wZXJ0aWVzIGFuZCB2YWx1ZXMgd2hpY2ggd2lsbCBiZSBhcHBsaWVkIHRvIHRoZSBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIHNldFN0eWxlcyhlbGVtZW50LCBzdHlsZXMpIHtcbiAgT2JqZWN0LmtleXMoc3R5bGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgdmFyIHVuaXQgPSAnJztcbiAgICAvLyBhZGQgdW5pdCBpZiB0aGUgdmFsdWUgaXMgbnVtZXJpYyBhbmQgaXMgb25lIG9mIHRoZSBmb2xsb3dpbmdcbiAgICBpZiAoWyd3aWR0aCcsICdoZWlnaHQnLCAndG9wJywgJ3JpZ2h0JywgJ2JvdHRvbScsICdsZWZ0J10uaW5kZXhPZihwcm9wKSAhPT0gLTEgJiYgaXNOdW1lcmljKHN0eWxlc1twcm9wXSkpIHtcbiAgICAgIHVuaXQgPSAncHgnO1xuICAgIH1cbiAgICBlbGVtZW50LnN0eWxlW3Byb3BdID0gc3R5bGVzW3Byb3BdICsgdW5pdDtcbiAgfSk7XG59XG5cbi8qKlxuICogU2V0IHRoZSBhdHRyaWJ1dGVzIHRvIHRoZSBnaXZlbiBwb3BwZXJcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudCAtIEVsZW1lbnQgdG8gYXBwbHkgdGhlIGF0dHJpYnV0ZXMgdG9cbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBzdHlsZXNcbiAqIE9iamVjdCB3aXRoIGEgbGlzdCBvZiBwcm9wZXJ0aWVzIGFuZCB2YWx1ZXMgd2hpY2ggd2lsbCBiZSBhcHBsaWVkIHRvIHRoZSBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIHNldEF0dHJpYnV0ZXMoZWxlbWVudCwgYXR0cmlidXRlcykge1xuICBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgdmFyIHZhbHVlID0gYXR0cmlidXRlc1twcm9wXTtcbiAgICBpZiAodmFsdWUgIT09IGZhbHNlKSB7XG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShwcm9wLCBhdHRyaWJ1dGVzW3Byb3BdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUocHJvcCk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSBgdXBkYXRlYCBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhLnN0eWxlcyAtIExpc3Qgb2Ygc3R5bGUgcHJvcGVydGllcyAtIHZhbHVlcyB0byBhcHBseSB0byBwb3BwZXIgZWxlbWVudFxuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEuYXR0cmlidXRlcyAtIExpc3Qgb2YgYXR0cmlidXRlIHByb3BlcnRpZXMgLSB2YWx1ZXMgdG8gYXBwbHkgdG8gcG9wcGVyIGVsZW1lbnRcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBzYW1lIGRhdGEgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIGFwcGx5U3R5bGUoZGF0YSkge1xuICAvLyBhbnkgcHJvcGVydHkgcHJlc2VudCBpbiBgZGF0YS5zdHlsZXNgIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyLFxuICAvLyBpbiB0aGlzIHdheSB3ZSBjYW4gbWFrZSB0aGUgM3JkIHBhcnR5IG1vZGlmaWVycyBhZGQgY3VzdG9tIHN0eWxlcyB0byBpdFxuICAvLyBCZSBhd2FyZSwgbW9kaWZpZXJzIGNvdWxkIG92ZXJyaWRlIHRoZSBwcm9wZXJ0aWVzIGRlZmluZWQgaW4gdGhlIHByZXZpb3VzXG4gIC8vIGxpbmVzIG9mIHRoaXMgbW9kaWZpZXIhXG4gIHNldFN0eWxlcyhkYXRhLmluc3RhbmNlLnBvcHBlciwgZGF0YS5zdHlsZXMpO1xuXG4gIC8vIGFueSBwcm9wZXJ0eSBwcmVzZW50IGluIGBkYXRhLmF0dHJpYnV0ZXNgIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyLFxuICAvLyB0aGV5IHdpbGwgYmUgc2V0IGFzIEhUTUwgYXR0cmlidXRlcyBvZiB0aGUgZWxlbWVudFxuICBzZXRBdHRyaWJ1dGVzKGRhdGEuaW5zdGFuY2UucG9wcGVyLCBkYXRhLmF0dHJpYnV0ZXMpO1xuXG4gIC8vIGlmIGFycm93RWxlbWVudCBpcyBkZWZpbmVkIGFuZCBhcnJvd1N0eWxlcyBoYXMgc29tZSBwcm9wZXJ0aWVzXG4gIGlmIChkYXRhLmFycm93RWxlbWVudCAmJiBPYmplY3Qua2V5cyhkYXRhLmFycm93U3R5bGVzKS5sZW5ndGgpIHtcbiAgICBzZXRTdHlsZXMoZGF0YS5hcnJvd0VsZW1lbnQsIGRhdGEuYXJyb3dTdHlsZXMpO1xuICB9XG5cbiAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKlxuICogU2V0IHRoZSB4LXBsYWNlbWVudCBhdHRyaWJ1dGUgYmVmb3JlIGV2ZXJ5dGhpbmcgZWxzZSBiZWNhdXNlIGl0IGNvdWxkIGJlIHVzZWRcbiAqIHRvIGFkZCBtYXJnaW5zIHRvIHRoZSBwb3BwZXIgbWFyZ2lucyBuZWVkcyB0byBiZSBjYWxjdWxhdGVkIHRvIGdldCB0aGVcbiAqIGNvcnJlY3QgcG9wcGVyIG9mZnNldHMuXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLm1vZGlmaWVyc1xuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcmVmZXJlbmNlIC0gVGhlIHJlZmVyZW5jZSBlbGVtZW50IHVzZWQgdG8gcG9zaXRpb24gdGhlIHBvcHBlclxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcG9wcGVyIC0gVGhlIEhUTUwgZWxlbWVudCB1c2VkIGFzIHBvcHBlclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBQb3BwZXIuanMgb3B0aW9uc1xuICovXG5mdW5jdGlvbiBhcHBseVN0eWxlT25Mb2FkKHJlZmVyZW5jZSwgcG9wcGVyLCBvcHRpb25zLCBtb2RpZmllck9wdGlvbnMsIHN0YXRlKSB7XG4gIC8vIGNvbXB1dGUgcmVmZXJlbmNlIGVsZW1lbnQgb2Zmc2V0c1xuICB2YXIgcmVmZXJlbmNlT2Zmc2V0cyA9IGdldFJlZmVyZW5jZU9mZnNldHMoc3RhdGUsIHBvcHBlciwgcmVmZXJlbmNlLCBvcHRpb25zLnBvc2l0aW9uRml4ZWQpO1xuXG4gIC8vIGNvbXB1dGUgYXV0byBwbGFjZW1lbnQsIHN0b3JlIHBsYWNlbWVudCBpbnNpZGUgdGhlIGRhdGEgb2JqZWN0LFxuICAvLyBtb2RpZmllcnMgd2lsbCBiZSBhYmxlIHRvIGVkaXQgYHBsYWNlbWVudGAgaWYgbmVlZGVkXG4gIC8vIGFuZCByZWZlciB0byBvcmlnaW5hbFBsYWNlbWVudCB0byBrbm93IHRoZSBvcmlnaW5hbCB2YWx1ZVxuICB2YXIgcGxhY2VtZW50ID0gY29tcHV0ZUF1dG9QbGFjZW1lbnQob3B0aW9ucy5wbGFjZW1lbnQsIHJlZmVyZW5jZU9mZnNldHMsIHBvcHBlciwgcmVmZXJlbmNlLCBvcHRpb25zLm1vZGlmaWVycy5mbGlwLmJvdW5kYXJpZXNFbGVtZW50LCBvcHRpb25zLm1vZGlmaWVycy5mbGlwLnBhZGRpbmcpO1xuXG4gIHBvcHBlci5zZXRBdHRyaWJ1dGUoJ3gtcGxhY2VtZW50JywgcGxhY2VtZW50KTtcblxuICAvLyBBcHBseSBgcG9zaXRpb25gIHRvIHBvcHBlciBiZWZvcmUgYW55dGhpbmcgZWxzZSBiZWNhdXNlXG4gIC8vIHdpdGhvdXQgdGhlIHBvc2l0aW9uIGFwcGxpZWQgd2UgY2FuJ3QgZ3VhcmFudGVlIGNvcnJlY3QgY29tcHV0YXRpb25zXG4gIHNldFN0eWxlcyhwb3BwZXIsIHsgcG9zaXRpb246IG9wdGlvbnMucG9zaXRpb25GaXhlZCA/ICdmaXhlZCcgOiAnYWJzb2x1dGUnIH0pO1xuXG4gIHJldHVybiBvcHRpb25zO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IGB1cGRhdGVgIG1ldGhvZFxuICogQGFyZ3VtZW50IHtPYmplY3R9IG9wdGlvbnMgLSBNb2RpZmllcnMgY29uZmlndXJhdGlvbiBhbmQgb3B0aW9uc1xuICogQHJldHVybnMge09iamVjdH0gVGhlIGRhdGEgb2JqZWN0LCBwcm9wZXJseSBtb2RpZmllZFxuICovXG5mdW5jdGlvbiBjb21wdXRlU3R5bGUoZGF0YSwgb3B0aW9ucykge1xuICB2YXIgeCA9IG9wdGlvbnMueCxcbiAgICAgIHkgPSBvcHRpb25zLnk7XG4gIHZhciBwb3BwZXIgPSBkYXRhLm9mZnNldHMucG9wcGVyO1xuXG4gIC8vIFJlbW92ZSB0aGlzIGxlZ2FjeSBzdXBwb3J0IGluIFBvcHBlci5qcyB2MlxuXG4gIHZhciBsZWdhY3lHcHVBY2NlbGVyYXRpb25PcHRpb24gPSBmaW5kKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCBmdW5jdGlvbiAobW9kaWZpZXIpIHtcbiAgICByZXR1cm4gbW9kaWZpZXIubmFtZSA9PT0gJ2FwcGx5U3R5bGUnO1xuICB9KS5ncHVBY2NlbGVyYXRpb247XG4gIGlmIChsZWdhY3lHcHVBY2NlbGVyYXRpb25PcHRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnNvbGUud2FybignV0FSTklORzogYGdwdUFjY2VsZXJhdGlvbmAgb3B0aW9uIG1vdmVkIHRvIGBjb21wdXRlU3R5bGVgIG1vZGlmaWVyIGFuZCB3aWxsIG5vdCBiZSBzdXBwb3J0ZWQgaW4gZnV0dXJlIHZlcnNpb25zIG9mIFBvcHBlci5qcyEnKTtcbiAgfVxuICB2YXIgZ3B1QWNjZWxlcmF0aW9uID0gbGVnYWN5R3B1QWNjZWxlcmF0aW9uT3B0aW9uICE9PSB1bmRlZmluZWQgPyBsZWdhY3lHcHVBY2NlbGVyYXRpb25PcHRpb24gOiBvcHRpb25zLmdwdUFjY2VsZXJhdGlvbjtcblxuICB2YXIgb2Zmc2V0UGFyZW50ID0gZ2V0T2Zmc2V0UGFyZW50KGRhdGEuaW5zdGFuY2UucG9wcGVyKTtcbiAgdmFyIG9mZnNldFBhcmVudFJlY3QgPSBnZXRCb3VuZGluZ0NsaWVudFJlY3Qob2Zmc2V0UGFyZW50KTtcblxuICAvLyBTdHlsZXNcbiAgdmFyIHN0eWxlcyA9IHtcbiAgICBwb3NpdGlvbjogcG9wcGVyLnBvc2l0aW9uXG4gIH07XG5cbiAgLy8gQXZvaWQgYmx1cnJ5IHRleHQgYnkgdXNpbmcgZnVsbCBwaXhlbCBpbnRlZ2Vycy5cbiAgLy8gRm9yIHBpeGVsLXBlcmZlY3QgcG9zaXRpb25pbmcsIHRvcC9ib3R0b20gcHJlZmVycyByb3VuZGVkXG4gIC8vIHZhbHVlcywgd2hpbGUgbGVmdC9yaWdodCBwcmVmZXJzIGZsb29yZWQgdmFsdWVzLlxuICB2YXIgb2Zmc2V0cyA9IHtcbiAgICBsZWZ0OiBNYXRoLmZsb29yKHBvcHBlci5sZWZ0KSxcbiAgICB0b3A6IE1hdGgucm91bmQocG9wcGVyLnRvcCksXG4gICAgYm90dG9tOiBNYXRoLnJvdW5kKHBvcHBlci5ib3R0b20pLFxuICAgIHJpZ2h0OiBNYXRoLmZsb29yKHBvcHBlci5yaWdodClcbiAgfTtcblxuICB2YXIgc2lkZUEgPSB4ID09PSAnYm90dG9tJyA/ICd0b3AnIDogJ2JvdHRvbSc7XG4gIHZhciBzaWRlQiA9IHkgPT09ICdyaWdodCcgPyAnbGVmdCcgOiAncmlnaHQnO1xuXG4gIC8vIGlmIGdwdUFjY2VsZXJhdGlvbiBpcyBzZXQgdG8gYHRydWVgIGFuZCB0cmFuc2Zvcm0gaXMgc3VwcG9ydGVkLFxuICAvLyAgd2UgdXNlIGB0cmFuc2xhdGUzZGAgdG8gYXBwbHkgdGhlIHBvc2l0aW9uIHRvIHRoZSBwb3BwZXIgd2VcbiAgLy8gYXV0b21hdGljYWxseSB1c2UgdGhlIHN1cHBvcnRlZCBwcmVmaXhlZCB2ZXJzaW9uIGlmIG5lZWRlZFxuICB2YXIgcHJlZml4ZWRQcm9wZXJ0eSA9IGdldFN1cHBvcnRlZFByb3BlcnR5TmFtZSgndHJhbnNmb3JtJyk7XG5cbiAgLy8gbm93LCBsZXQncyBtYWtlIGEgc3RlcCBiYWNrIGFuZCBsb29rIGF0IHRoaXMgY29kZSBjbG9zZWx5ICh3dGY/KVxuICAvLyBJZiB0aGUgY29udGVudCBvZiB0aGUgcG9wcGVyIGdyb3dzIG9uY2UgaXQncyBiZWVuIHBvc2l0aW9uZWQsIGl0XG4gIC8vIG1heSBoYXBwZW4gdGhhdCB0aGUgcG9wcGVyIGdldHMgbWlzcGxhY2VkIGJlY2F1c2Ugb2YgdGhlIG5ldyBjb250ZW50XG4gIC8vIG92ZXJmbG93aW5nIGl0cyByZWZlcmVuY2UgZWxlbWVudFxuICAvLyBUbyBhdm9pZCB0aGlzIHByb2JsZW0sIHdlIHByb3ZpZGUgdHdvIG9wdGlvbnMgKHggYW5kIHkpLCB3aGljaCBhbGxvd1xuICAvLyB0aGUgY29uc3VtZXIgdG8gZGVmaW5lIHRoZSBvZmZzZXQgb3JpZ2luLlxuICAvLyBJZiB3ZSBwb3NpdGlvbiBhIHBvcHBlciBvbiB0b3Agb2YgYSByZWZlcmVuY2UgZWxlbWVudCwgd2UgY2FuIHNldFxuICAvLyBgeGAgdG8gYHRvcGAgdG8gbWFrZSB0aGUgcG9wcGVyIGdyb3cgdG93YXJkcyBpdHMgdG9wIGluc3RlYWQgb2ZcbiAgLy8gaXRzIGJvdHRvbS5cbiAgdmFyIGxlZnQgPSB2b2lkIDAsXG4gICAgICB0b3AgPSB2b2lkIDA7XG4gIGlmIChzaWRlQSA9PT0gJ2JvdHRvbScpIHtcbiAgICAvLyB3aGVuIG9mZnNldFBhcmVudCBpcyA8aHRtbD4gdGhlIHBvc2l0aW9uaW5nIGlzIHJlbGF0aXZlIHRvIHRoZSBib3R0b20gb2YgdGhlIHNjcmVlbiAoZXhjbHVkaW5nIHRoZSBzY3JvbGxiYXIpXG4gICAgLy8gYW5kIG5vdCB0aGUgYm90dG9tIG9mIHRoZSBodG1sIGVsZW1lbnRcbiAgICBpZiAob2Zmc2V0UGFyZW50Lm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgIHRvcCA9IC1vZmZzZXRQYXJlbnQuY2xpZW50SGVpZ2h0ICsgb2Zmc2V0cy5ib3R0b207XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvcCA9IC1vZmZzZXRQYXJlbnRSZWN0LmhlaWdodCArIG9mZnNldHMuYm90dG9tO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0b3AgPSBvZmZzZXRzLnRvcDtcbiAgfVxuICBpZiAoc2lkZUIgPT09ICdyaWdodCcpIHtcbiAgICBpZiAob2Zmc2V0UGFyZW50Lm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgIGxlZnQgPSAtb2Zmc2V0UGFyZW50LmNsaWVudFdpZHRoICsgb2Zmc2V0cy5yaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdCA9IC1vZmZzZXRQYXJlbnRSZWN0LndpZHRoICsgb2Zmc2V0cy5yaWdodDtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbGVmdCA9IG9mZnNldHMubGVmdDtcbiAgfVxuICBpZiAoZ3B1QWNjZWxlcmF0aW9uICYmIHByZWZpeGVkUHJvcGVydHkpIHtcbiAgICBzdHlsZXNbcHJlZml4ZWRQcm9wZXJ0eV0gPSAndHJhbnNsYXRlM2QoJyArIGxlZnQgKyAncHgsICcgKyB0b3AgKyAncHgsIDApJztcbiAgICBzdHlsZXNbc2lkZUFdID0gMDtcbiAgICBzdHlsZXNbc2lkZUJdID0gMDtcbiAgICBzdHlsZXMud2lsbENoYW5nZSA9ICd0cmFuc2Zvcm0nO1xuICB9IGVsc2Uge1xuICAgIC8vIG90aHdlcmlzZSwgd2UgdXNlIHRoZSBzdGFuZGFyZCBgdG9wYCwgYGxlZnRgLCBgYm90dG9tYCBhbmQgYHJpZ2h0YCBwcm9wZXJ0aWVzXG4gICAgdmFyIGludmVydFRvcCA9IHNpZGVBID09PSAnYm90dG9tJyA/IC0xIDogMTtcbiAgICB2YXIgaW52ZXJ0TGVmdCA9IHNpZGVCID09PSAncmlnaHQnID8gLTEgOiAxO1xuICAgIHN0eWxlc1tzaWRlQV0gPSB0b3AgKiBpbnZlcnRUb3A7XG4gICAgc3R5bGVzW3NpZGVCXSA9IGxlZnQgKiBpbnZlcnRMZWZ0O1xuICAgIHN0eWxlcy53aWxsQ2hhbmdlID0gc2lkZUEgKyAnLCAnICsgc2lkZUI7XG4gIH1cblxuICAvLyBBdHRyaWJ1dGVzXG4gIHZhciBhdHRyaWJ1dGVzID0ge1xuICAgICd4LXBsYWNlbWVudCc6IGRhdGEucGxhY2VtZW50XG4gIH07XG5cbiAgLy8gVXBkYXRlIGBkYXRhYCBhdHRyaWJ1dGVzLCBzdHlsZXMgYW5kIGFycm93U3R5bGVzXG4gIGRhdGEuYXR0cmlidXRlcyA9IF9leHRlbmRzKHt9LCBhdHRyaWJ1dGVzLCBkYXRhLmF0dHJpYnV0ZXMpO1xuICBkYXRhLnN0eWxlcyA9IF9leHRlbmRzKHt9LCBzdHlsZXMsIGRhdGEuc3R5bGVzKTtcbiAgZGF0YS5hcnJvd1N0eWxlcyA9IF9leHRlbmRzKHt9LCBkYXRhLm9mZnNldHMuYXJyb3csIGRhdGEuYXJyb3dTdHlsZXMpO1xuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIEhlbHBlciB1c2VkIHRvIGtub3cgaWYgdGhlIGdpdmVuIG1vZGlmaWVyIGRlcGVuZHMgZnJvbSBhbm90aGVyIG9uZS48YnIgLz5cbiAqIEl0IGNoZWNrcyBpZiB0aGUgbmVlZGVkIG1vZGlmaWVyIGlzIGxpc3RlZCBhbmQgZW5hYmxlZC5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVycyAtIGxpc3Qgb2YgbW9kaWZpZXJzXG4gKiBAcGFyYW0ge1N0cmluZ30gcmVxdWVzdGluZ05hbWUgLSBuYW1lIG9mIHJlcXVlc3RpbmcgbW9kaWZpZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSByZXF1ZXN0ZWROYW1lIC0gbmFtZSBvZiByZXF1ZXN0ZWQgbW9kaWZpZXJcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc01vZGlmaWVyUmVxdWlyZWQobW9kaWZpZXJzLCByZXF1ZXN0aW5nTmFtZSwgcmVxdWVzdGVkTmFtZSkge1xuICB2YXIgcmVxdWVzdGluZyA9IGZpbmQobW9kaWZpZXJzLCBmdW5jdGlvbiAoX3JlZikge1xuICAgIHZhciBuYW1lID0gX3JlZi5uYW1lO1xuICAgIHJldHVybiBuYW1lID09PSByZXF1ZXN0aW5nTmFtZTtcbiAgfSk7XG5cbiAgdmFyIGlzUmVxdWlyZWQgPSAhIXJlcXVlc3RpbmcgJiYgbW9kaWZpZXJzLnNvbWUoZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gICAgcmV0dXJuIG1vZGlmaWVyLm5hbWUgPT09IHJlcXVlc3RlZE5hbWUgJiYgbW9kaWZpZXIuZW5hYmxlZCAmJiBtb2RpZmllci5vcmRlciA8IHJlcXVlc3Rpbmcub3JkZXI7XG4gIH0pO1xuXG4gIGlmICghaXNSZXF1aXJlZCkge1xuICAgIHZhciBfcmVxdWVzdGluZyA9ICdgJyArIHJlcXVlc3RpbmdOYW1lICsgJ2AnO1xuICAgIHZhciByZXF1ZXN0ZWQgPSAnYCcgKyByZXF1ZXN0ZWROYW1lICsgJ2AnO1xuICAgIGNvbnNvbGUud2FybihyZXF1ZXN0ZWQgKyAnIG1vZGlmaWVyIGlzIHJlcXVpcmVkIGJ5ICcgKyBfcmVxdWVzdGluZyArICcgbW9kaWZpZXIgaW4gb3JkZXIgdG8gd29yaywgYmUgc3VyZSB0byBpbmNsdWRlIGl0IGJlZm9yZSAnICsgX3JlcXVlc3RpbmcgKyAnIScpO1xuICB9XG4gIHJldHVybiBpc1JlcXVpcmVkO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gYXJyb3coZGF0YSwgb3B0aW9ucykge1xuICB2YXIgX2RhdGEkb2Zmc2V0cyRhcnJvdztcblxuICAvLyBhcnJvdyBkZXBlbmRzIG9uIGtlZXBUb2dldGhlciBpbiBvcmRlciB0byB3b3JrXG4gIGlmICghaXNNb2RpZmllclJlcXVpcmVkKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCAnYXJyb3cnLCAna2VlcFRvZ2V0aGVyJykpIHtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBhcnJvd0VsZW1lbnQgPSBvcHRpb25zLmVsZW1lbnQ7XG5cbiAgLy8gaWYgYXJyb3dFbGVtZW50IGlzIGEgc3RyaW5nLCBzdXBwb3NlIGl0J3MgYSBDU1Mgc2VsZWN0b3JcbiAgaWYgKHR5cGVvZiBhcnJvd0VsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgYXJyb3dFbGVtZW50ID0gZGF0YS5pbnN0YW5jZS5wb3BwZXIucXVlcnlTZWxlY3RvcihhcnJvd0VsZW1lbnQpO1xuXG4gICAgLy8gaWYgYXJyb3dFbGVtZW50IGlzIG5vdCBmb3VuZCwgZG9uJ3QgcnVuIHRoZSBtb2RpZmllclxuICAgIGlmICghYXJyb3dFbGVtZW50KSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gaWYgdGhlIGFycm93RWxlbWVudCBpc24ndCBhIHF1ZXJ5IHNlbGVjdG9yIHdlIG11c3QgY2hlY2sgdGhhdCB0aGVcbiAgICAvLyBwcm92aWRlZCBET00gbm9kZSBpcyBjaGlsZCBvZiBpdHMgcG9wcGVyIG5vZGVcbiAgICBpZiAoIWRhdGEuaW5zdGFuY2UucG9wcGVyLmNvbnRhaW5zKGFycm93RWxlbWVudCkpIHtcbiAgICAgIGNvbnNvbGUud2FybignV0FSTklORzogYGFycm93LmVsZW1lbnRgIG11c3QgYmUgY2hpbGQgb2YgaXRzIHBvcHBlciBlbGVtZW50IScpO1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuICB9XG5cbiAgdmFyIHBsYWNlbWVudCA9IGRhdGEucGxhY2VtZW50LnNwbGl0KCctJylbMF07XG4gIHZhciBfZGF0YSRvZmZzZXRzID0gZGF0YS5vZmZzZXRzLFxuICAgICAgcG9wcGVyID0gX2RhdGEkb2Zmc2V0cy5wb3BwZXIsXG4gICAgICByZWZlcmVuY2UgPSBfZGF0YSRvZmZzZXRzLnJlZmVyZW5jZTtcblxuICB2YXIgaXNWZXJ0aWNhbCA9IFsnbGVmdCcsICdyaWdodCddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTE7XG5cbiAgdmFyIGxlbiA9IGlzVmVydGljYWwgPyAnaGVpZ2h0JyA6ICd3aWR0aCc7XG4gIHZhciBzaWRlQ2FwaXRhbGl6ZWQgPSBpc1ZlcnRpY2FsID8gJ1RvcCcgOiAnTGVmdCc7XG4gIHZhciBzaWRlID0gc2lkZUNhcGl0YWxpemVkLnRvTG93ZXJDYXNlKCk7XG4gIHZhciBhbHRTaWRlID0gaXNWZXJ0aWNhbCA/ICdsZWZ0JyA6ICd0b3AnO1xuICB2YXIgb3BTaWRlID0gaXNWZXJ0aWNhbCA/ICdib3R0b20nIDogJ3JpZ2h0JztcbiAgdmFyIGFycm93RWxlbWVudFNpemUgPSBnZXRPdXRlclNpemVzKGFycm93RWxlbWVudClbbGVuXTtcblxuICAvL1xuICAvLyBleHRlbmRzIGtlZXBUb2dldGhlciBiZWhhdmlvciBtYWtpbmcgc3VyZSB0aGUgcG9wcGVyIGFuZCBpdHNcbiAgLy8gcmVmZXJlbmNlIGhhdmUgZW5vdWdoIHBpeGVscyBpbiBjb25qdW5jdGlvblxuICAvL1xuXG4gIC8vIHRvcC9sZWZ0IHNpZGVcbiAgaWYgKHJlZmVyZW5jZVtvcFNpZGVdIC0gYXJyb3dFbGVtZW50U2l6ZSA8IHBvcHBlcltzaWRlXSkge1xuICAgIGRhdGEub2Zmc2V0cy5wb3BwZXJbc2lkZV0gLT0gcG9wcGVyW3NpZGVdIC0gKHJlZmVyZW5jZVtvcFNpZGVdIC0gYXJyb3dFbGVtZW50U2l6ZSk7XG4gIH1cbiAgLy8gYm90dG9tL3JpZ2h0IHNpZGVcbiAgaWYgKHJlZmVyZW5jZVtzaWRlXSArIGFycm93RWxlbWVudFNpemUgPiBwb3BwZXJbb3BTaWRlXSkge1xuICAgIGRhdGEub2Zmc2V0cy5wb3BwZXJbc2lkZV0gKz0gcmVmZXJlbmNlW3NpZGVdICsgYXJyb3dFbGVtZW50U2l6ZSAtIHBvcHBlcltvcFNpZGVdO1xuICB9XG4gIGRhdGEub2Zmc2V0cy5wb3BwZXIgPSBnZXRDbGllbnRSZWN0KGRhdGEub2Zmc2V0cy5wb3BwZXIpO1xuXG4gIC8vIGNvbXB1dGUgY2VudGVyIG9mIHRoZSBwb3BwZXJcbiAgdmFyIGNlbnRlciA9IHJlZmVyZW5jZVtzaWRlXSArIHJlZmVyZW5jZVtsZW5dIC8gMiAtIGFycm93RWxlbWVudFNpemUgLyAyO1xuXG4gIC8vIENvbXB1dGUgdGhlIHNpZGVWYWx1ZSB1c2luZyB0aGUgdXBkYXRlZCBwb3BwZXIgb2Zmc2V0c1xuICAvLyB0YWtlIHBvcHBlciBtYXJnaW4gaW4gYWNjb3VudCBiZWNhdXNlIHdlIGRvbid0IGhhdmUgdGhpcyBpbmZvIGF2YWlsYWJsZVxuICB2YXIgY3NzID0gZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5KGRhdGEuaW5zdGFuY2UucG9wcGVyKTtcbiAgdmFyIHBvcHBlck1hcmdpblNpZGUgPSBwYXJzZUZsb2F0KGNzc1snbWFyZ2luJyArIHNpZGVDYXBpdGFsaXplZF0sIDEwKTtcbiAgdmFyIHBvcHBlckJvcmRlclNpZGUgPSBwYXJzZUZsb2F0KGNzc1snYm9yZGVyJyArIHNpZGVDYXBpdGFsaXplZCArICdXaWR0aCddLCAxMCk7XG4gIHZhciBzaWRlVmFsdWUgPSBjZW50ZXIgLSBkYXRhLm9mZnNldHMucG9wcGVyW3NpZGVdIC0gcG9wcGVyTWFyZ2luU2lkZSAtIHBvcHBlckJvcmRlclNpZGU7XG5cbiAgLy8gcHJldmVudCBhcnJvd0VsZW1lbnQgZnJvbSBiZWluZyBwbGFjZWQgbm90IGNvbnRpZ3VvdXNseSB0byBpdHMgcG9wcGVyXG4gIHNpZGVWYWx1ZSA9IE1hdGgubWF4KE1hdGgubWluKHBvcHBlcltsZW5dIC0gYXJyb3dFbGVtZW50U2l6ZSwgc2lkZVZhbHVlKSwgMCk7XG5cbiAgZGF0YS5hcnJvd0VsZW1lbnQgPSBhcnJvd0VsZW1lbnQ7XG4gIGRhdGEub2Zmc2V0cy5hcnJvdyA9IChfZGF0YSRvZmZzZXRzJGFycm93ID0ge30sIGRlZmluZVByb3BlcnR5KF9kYXRhJG9mZnNldHMkYXJyb3csIHNpZGUsIE1hdGgucm91bmQoc2lkZVZhbHVlKSksIGRlZmluZVByb3BlcnR5KF9kYXRhJG9mZnNldHMkYXJyb3csIGFsdFNpZGUsICcnKSwgX2RhdGEkb2Zmc2V0cyRhcnJvdyk7XG5cbiAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKlxuICogR2V0IHRoZSBvcHBvc2l0ZSBwbGFjZW1lbnQgdmFyaWF0aW9uIG9mIHRoZSBnaXZlbiBvbmVcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBwbGFjZW1lbnQgdmFyaWF0aW9uXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBmbGlwcGVkIHBsYWNlbWVudCB2YXJpYXRpb25cbiAqL1xuZnVuY3Rpb24gZ2V0T3Bwb3NpdGVWYXJpYXRpb24odmFyaWF0aW9uKSB7XG4gIGlmICh2YXJpYXRpb24gPT09ICdlbmQnKSB7XG4gICAgcmV0dXJuICdzdGFydCc7XG4gIH0gZWxzZSBpZiAodmFyaWF0aW9uID09PSAnc3RhcnQnKSB7XG4gICAgcmV0dXJuICdlbmQnO1xuICB9XG4gIHJldHVybiB2YXJpYXRpb247XG59XG5cbi8qKlxuICogTGlzdCBvZiBhY2NlcHRlZCBwbGFjZW1lbnRzIHRvIHVzZSBhcyB2YWx1ZXMgb2YgdGhlIGBwbGFjZW1lbnRgIG9wdGlvbi48YnIgLz5cbiAqIFZhbGlkIHBsYWNlbWVudHMgYXJlOlxuICogLSBgYXV0b2BcbiAqIC0gYHRvcGBcbiAqIC0gYHJpZ2h0YFxuICogLSBgYm90dG9tYFxuICogLSBgbGVmdGBcbiAqXG4gKiBFYWNoIHBsYWNlbWVudCBjYW4gaGF2ZSBhIHZhcmlhdGlvbiBmcm9tIHRoaXMgbGlzdDpcbiAqIC0gYC1zdGFydGBcbiAqIC0gYC1lbmRgXG4gKlxuICogVmFyaWF0aW9ucyBhcmUgaW50ZXJwcmV0ZWQgZWFzaWx5IGlmIHlvdSB0aGluayBvZiB0aGVtIGFzIHRoZSBsZWZ0IHRvIHJpZ2h0XG4gKiB3cml0dGVuIGxhbmd1YWdlcy4gSG9yaXpvbnRhbGx5IChgdG9wYCBhbmQgYGJvdHRvbWApLCBgc3RhcnRgIGlzIGxlZnQgYW5kIGBlbmRgXG4gKiBpcyByaWdodC48YnIgLz5cbiAqIFZlcnRpY2FsbHkgKGBsZWZ0YCBhbmQgYHJpZ2h0YCksIGBzdGFydGAgaXMgdG9wIGFuZCBgZW5kYCBpcyBib3R0b20uXG4gKlxuICogU29tZSB2YWxpZCBleGFtcGxlcyBhcmU6XG4gKiAtIGB0b3AtZW5kYCAob24gdG9wIG9mIHJlZmVyZW5jZSwgcmlnaHQgYWxpZ25lZClcbiAqIC0gYHJpZ2h0LXN0YXJ0YCAob24gcmlnaHQgb2YgcmVmZXJlbmNlLCB0b3AgYWxpZ25lZClcbiAqIC0gYGJvdHRvbWAgKG9uIGJvdHRvbSwgY2VudGVyZWQpXG4gKiAtIGBhdXRvLWVuZGAgKG9uIHRoZSBzaWRlIHdpdGggbW9yZSBzcGFjZSBhdmFpbGFibGUsIGFsaWdubWVudCBkZXBlbmRzIGJ5IHBsYWNlbWVudClcbiAqXG4gKiBAc3RhdGljXG4gKiBAdHlwZSB7QXJyYXl9XG4gKiBAZW51bSB7U3RyaW5nfVxuICogQHJlYWRvbmx5XG4gKiBAbWV0aG9kIHBsYWNlbWVudHNcbiAqIEBtZW1iZXJvZiBQb3BwZXJcbiAqL1xudmFyIHBsYWNlbWVudHMgPSBbJ2F1dG8tc3RhcnQnLCAnYXV0bycsICdhdXRvLWVuZCcsICd0b3Atc3RhcnQnLCAndG9wJywgJ3RvcC1lbmQnLCAncmlnaHQtc3RhcnQnLCAncmlnaHQnLCAncmlnaHQtZW5kJywgJ2JvdHRvbS1lbmQnLCAnYm90dG9tJywgJ2JvdHRvbS1zdGFydCcsICdsZWZ0LWVuZCcsICdsZWZ0JywgJ2xlZnQtc3RhcnQnXTtcblxuLy8gR2V0IHJpZCBvZiBgYXV0b2AgYGF1dG8tc3RhcnRgIGFuZCBgYXV0by1lbmRgXG52YXIgdmFsaWRQbGFjZW1lbnRzID0gcGxhY2VtZW50cy5zbGljZSgzKTtcblxuLyoqXG4gKiBHaXZlbiBhbiBpbml0aWFsIHBsYWNlbWVudCwgcmV0dXJucyBhbGwgdGhlIHN1YnNlcXVlbnQgcGxhY2VtZW50c1xuICogY2xvY2t3aXNlIChvciBjb3VudGVyLWNsb2Nrd2lzZSkuXG4gKlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtTdHJpbmd9IHBsYWNlbWVudCAtIEEgdmFsaWQgcGxhY2VtZW50IChpdCBhY2NlcHRzIHZhcmlhdGlvbnMpXG4gKiBAYXJndW1lbnQge0Jvb2xlYW59IGNvdW50ZXIgLSBTZXQgdG8gdHJ1ZSB0byB3YWxrIHRoZSBwbGFjZW1lbnRzIGNvdW50ZXJjbG9ja3dpc2VcbiAqIEByZXR1cm5zIHtBcnJheX0gcGxhY2VtZW50cyBpbmNsdWRpbmcgdGhlaXIgdmFyaWF0aW9uc1xuICovXG5mdW5jdGlvbiBjbG9ja3dpc2UocGxhY2VtZW50KSB7XG4gIHZhciBjb3VudGVyID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBmYWxzZTtcblxuICB2YXIgaW5kZXggPSB2YWxpZFBsYWNlbWVudHMuaW5kZXhPZihwbGFjZW1lbnQpO1xuICB2YXIgYXJyID0gdmFsaWRQbGFjZW1lbnRzLnNsaWNlKGluZGV4ICsgMSkuY29uY2F0KHZhbGlkUGxhY2VtZW50cy5zbGljZSgwLCBpbmRleCkpO1xuICByZXR1cm4gY291bnRlciA/IGFyci5yZXZlcnNlKCkgOiBhcnI7XG59XG5cbnZhciBCRUhBVklPUlMgPSB7XG4gIEZMSVA6ICdmbGlwJyxcbiAgQ0xPQ0tXSVNFOiAnY2xvY2t3aXNlJyxcbiAgQ09VTlRFUkNMT0NLV0lTRTogJ2NvdW50ZXJjbG9ja3dpc2UnXG59O1xuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gZmxpcChkYXRhLCBvcHRpb25zKSB7XG4gIC8vIGlmIGBpbm5lcmAgbW9kaWZpZXIgaXMgZW5hYmxlZCwgd2UgY2FuJ3QgdXNlIHRoZSBgZmxpcGAgbW9kaWZpZXJcbiAgaWYgKGlzTW9kaWZpZXJFbmFibGVkKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCAnaW5uZXInKSkge1xuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgaWYgKGRhdGEuZmxpcHBlZCAmJiBkYXRhLnBsYWNlbWVudCA9PT0gZGF0YS5vcmlnaW5hbFBsYWNlbWVudCkge1xuICAgIC8vIHNlZW1zIGxpa2UgZmxpcCBpcyB0cnlpbmcgdG8gbG9vcCwgcHJvYmFibHkgdGhlcmUncyBub3QgZW5vdWdoIHNwYWNlIG9uIGFueSBvZiB0aGUgZmxpcHBhYmxlIHNpZGVzXG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICB2YXIgYm91bmRhcmllcyA9IGdldEJvdW5kYXJpZXMoZGF0YS5pbnN0YW5jZS5wb3BwZXIsIGRhdGEuaW5zdGFuY2UucmVmZXJlbmNlLCBvcHRpb25zLnBhZGRpbmcsIG9wdGlvbnMuYm91bmRhcmllc0VsZW1lbnQsIGRhdGEucG9zaXRpb25GaXhlZCk7XG5cbiAgdmFyIHBsYWNlbWVudCA9IGRhdGEucGxhY2VtZW50LnNwbGl0KCctJylbMF07XG4gIHZhciBwbGFjZW1lbnRPcHBvc2l0ZSA9IGdldE9wcG9zaXRlUGxhY2VtZW50KHBsYWNlbWVudCk7XG4gIHZhciB2YXJpYXRpb24gPSBkYXRhLnBsYWNlbWVudC5zcGxpdCgnLScpWzFdIHx8ICcnO1xuXG4gIHZhciBmbGlwT3JkZXIgPSBbXTtcblxuICBzd2l0Y2ggKG9wdGlvbnMuYmVoYXZpb3IpIHtcbiAgICBjYXNlIEJFSEFWSU9SUy5GTElQOlxuICAgICAgZmxpcE9yZGVyID0gW3BsYWNlbWVudCwgcGxhY2VtZW50T3Bwb3NpdGVdO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBCRUhBVklPUlMuQ0xPQ0tXSVNFOlxuICAgICAgZmxpcE9yZGVyID0gY2xvY2t3aXNlKHBsYWNlbWVudCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJFSEFWSU9SUy5DT1VOVEVSQ0xPQ0tXSVNFOlxuICAgICAgZmxpcE9yZGVyID0gY2xvY2t3aXNlKHBsYWNlbWVudCwgdHJ1ZSk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgZmxpcE9yZGVyID0gb3B0aW9ucy5iZWhhdmlvcjtcbiAgfVxuXG4gIGZsaXBPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzdGVwLCBpbmRleCkge1xuICAgIGlmIChwbGFjZW1lbnQgIT09IHN0ZXAgfHwgZmxpcE9yZGVyLmxlbmd0aCA9PT0gaW5kZXggKyAxKSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG5cbiAgICBwbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuICAgIHBsYWNlbWVudE9wcG9zaXRlID0gZ2V0T3Bwb3NpdGVQbGFjZW1lbnQocGxhY2VtZW50KTtcblxuICAgIHZhciBwb3BwZXJPZmZzZXRzID0gZGF0YS5vZmZzZXRzLnBvcHBlcjtcbiAgICB2YXIgcmVmT2Zmc2V0cyA9IGRhdGEub2Zmc2V0cy5yZWZlcmVuY2U7XG5cbiAgICAvLyB1c2luZyBmbG9vciBiZWNhdXNlIHRoZSByZWZlcmVuY2Ugb2Zmc2V0cyBtYXkgY29udGFpbiBkZWNpbWFscyB3ZSBhcmUgbm90IGdvaW5nIHRvIGNvbnNpZGVyIGhlcmVcbiAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgIHZhciBvdmVybGFwc1JlZiA9IHBsYWNlbWVudCA9PT0gJ2xlZnQnICYmIGZsb29yKHBvcHBlck9mZnNldHMucmlnaHQpID4gZmxvb3IocmVmT2Zmc2V0cy5sZWZ0KSB8fCBwbGFjZW1lbnQgPT09ICdyaWdodCcgJiYgZmxvb3IocG9wcGVyT2Zmc2V0cy5sZWZ0KSA8IGZsb29yKHJlZk9mZnNldHMucmlnaHQpIHx8IHBsYWNlbWVudCA9PT0gJ3RvcCcgJiYgZmxvb3IocG9wcGVyT2Zmc2V0cy5ib3R0b20pID4gZmxvb3IocmVmT2Zmc2V0cy50b3ApIHx8IHBsYWNlbWVudCA9PT0gJ2JvdHRvbScgJiYgZmxvb3IocG9wcGVyT2Zmc2V0cy50b3ApIDwgZmxvb3IocmVmT2Zmc2V0cy5ib3R0b20pO1xuXG4gICAgdmFyIG92ZXJmbG93c0xlZnQgPSBmbG9vcihwb3BwZXJPZmZzZXRzLmxlZnQpIDwgZmxvb3IoYm91bmRhcmllcy5sZWZ0KTtcbiAgICB2YXIgb3ZlcmZsb3dzUmlnaHQgPSBmbG9vcihwb3BwZXJPZmZzZXRzLnJpZ2h0KSA+IGZsb29yKGJvdW5kYXJpZXMucmlnaHQpO1xuICAgIHZhciBvdmVyZmxvd3NUb3AgPSBmbG9vcihwb3BwZXJPZmZzZXRzLnRvcCkgPCBmbG9vcihib3VuZGFyaWVzLnRvcCk7XG4gICAgdmFyIG92ZXJmbG93c0JvdHRvbSA9IGZsb29yKHBvcHBlck9mZnNldHMuYm90dG9tKSA+IGZsb29yKGJvdW5kYXJpZXMuYm90dG9tKTtcblxuICAgIHZhciBvdmVyZmxvd3NCb3VuZGFyaWVzID0gcGxhY2VtZW50ID09PSAnbGVmdCcgJiYgb3ZlcmZsb3dzTGVmdCB8fCBwbGFjZW1lbnQgPT09ICdyaWdodCcgJiYgb3ZlcmZsb3dzUmlnaHQgfHwgcGxhY2VtZW50ID09PSAndG9wJyAmJiBvdmVyZmxvd3NUb3AgfHwgcGxhY2VtZW50ID09PSAnYm90dG9tJyAmJiBvdmVyZmxvd3NCb3R0b207XG5cbiAgICAvLyBmbGlwIHRoZSB2YXJpYXRpb24gaWYgcmVxdWlyZWRcbiAgICB2YXIgaXNWZXJ0aWNhbCA9IFsndG9wJywgJ2JvdHRvbSddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTE7XG4gICAgdmFyIGZsaXBwZWRWYXJpYXRpb24gPSAhIW9wdGlvbnMuZmxpcFZhcmlhdGlvbnMgJiYgKGlzVmVydGljYWwgJiYgdmFyaWF0aW9uID09PSAnc3RhcnQnICYmIG92ZXJmbG93c0xlZnQgfHwgaXNWZXJ0aWNhbCAmJiB2YXJpYXRpb24gPT09ICdlbmQnICYmIG92ZXJmbG93c1JpZ2h0IHx8ICFpc1ZlcnRpY2FsICYmIHZhcmlhdGlvbiA9PT0gJ3N0YXJ0JyAmJiBvdmVyZmxvd3NUb3AgfHwgIWlzVmVydGljYWwgJiYgdmFyaWF0aW9uID09PSAnZW5kJyAmJiBvdmVyZmxvd3NCb3R0b20pO1xuXG4gICAgaWYgKG92ZXJsYXBzUmVmIHx8IG92ZXJmbG93c0JvdW5kYXJpZXMgfHwgZmxpcHBlZFZhcmlhdGlvbikge1xuICAgICAgLy8gdGhpcyBib29sZWFuIHRvIGRldGVjdCBhbnkgZmxpcCBsb29wXG4gICAgICBkYXRhLmZsaXBwZWQgPSB0cnVlO1xuXG4gICAgICBpZiAob3ZlcmxhcHNSZWYgfHwgb3ZlcmZsb3dzQm91bmRhcmllcykge1xuICAgICAgICBwbGFjZW1lbnQgPSBmbGlwT3JkZXJbaW5kZXggKyAxXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGZsaXBwZWRWYXJpYXRpb24pIHtcbiAgICAgICAgdmFyaWF0aW9uID0gZ2V0T3Bwb3NpdGVWYXJpYXRpb24odmFyaWF0aW9uKTtcbiAgICAgIH1cblxuICAgICAgZGF0YS5wbGFjZW1lbnQgPSBwbGFjZW1lbnQgKyAodmFyaWF0aW9uID8gJy0nICsgdmFyaWF0aW9uIDogJycpO1xuXG4gICAgICAvLyB0aGlzIG9iamVjdCBjb250YWlucyBgcG9zaXRpb25gLCB3ZSB3YW50IHRvIHByZXNlcnZlIGl0IGFsb25nIHdpdGhcbiAgICAgIC8vIGFueSBhZGRpdGlvbmFsIHByb3BlcnR5IHdlIG1heSBhZGQgaW4gdGhlIGZ1dHVyZVxuICAgICAgZGF0YS5vZmZzZXRzLnBvcHBlciA9IF9leHRlbmRzKHt9LCBkYXRhLm9mZnNldHMucG9wcGVyLCBnZXRQb3BwZXJPZmZzZXRzKGRhdGEuaW5zdGFuY2UucG9wcGVyLCBkYXRhLm9mZnNldHMucmVmZXJlbmNlLCBkYXRhLnBsYWNlbWVudCkpO1xuXG4gICAgICBkYXRhID0gcnVuTW9kaWZpZXJzKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCBkYXRhLCAnZmxpcCcpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24ga2VlcFRvZ2V0aGVyKGRhdGEpIHtcbiAgdmFyIF9kYXRhJG9mZnNldHMgPSBkYXRhLm9mZnNldHMsXG4gICAgICBwb3BwZXIgPSBfZGF0YSRvZmZzZXRzLnBvcHBlcixcbiAgICAgIHJlZmVyZW5jZSA9IF9kYXRhJG9mZnNldHMucmVmZXJlbmNlO1xuXG4gIHZhciBwbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICB2YXIgaXNWZXJ0aWNhbCA9IFsndG9wJywgJ2JvdHRvbSddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTE7XG4gIHZhciBzaWRlID0gaXNWZXJ0aWNhbCA/ICdyaWdodCcgOiAnYm90dG9tJztcbiAgdmFyIG9wU2lkZSA9IGlzVmVydGljYWwgPyAnbGVmdCcgOiAndG9wJztcbiAgdmFyIG1lYXN1cmVtZW50ID0gaXNWZXJ0aWNhbCA/ICd3aWR0aCcgOiAnaGVpZ2h0JztcblxuICBpZiAocG9wcGVyW3NpZGVdIDwgZmxvb3IocmVmZXJlbmNlW29wU2lkZV0pKSB7XG4gICAgZGF0YS5vZmZzZXRzLnBvcHBlcltvcFNpZGVdID0gZmxvb3IocmVmZXJlbmNlW29wU2lkZV0pIC0gcG9wcGVyW21lYXN1cmVtZW50XTtcbiAgfVxuICBpZiAocG9wcGVyW29wU2lkZV0gPiBmbG9vcihyZWZlcmVuY2Vbc2lkZV0pKSB7XG4gICAgZGF0YS5vZmZzZXRzLnBvcHBlcltvcFNpZGVdID0gZmxvb3IocmVmZXJlbmNlW3NpZGVdKTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgc3RyaW5nIGNvbnRhaW5pbmcgdmFsdWUgKyB1bml0IGludG8gYSBweCB2YWx1ZSBudW1iZXJcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIHttb2RpZmllcnN+b2Zmc2V0fVxuICogQHByaXZhdGVcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBzdHIgLSBWYWx1ZSArIHVuaXQgc3RyaW5nXG4gKiBAYXJndW1lbnQge1N0cmluZ30gbWVhc3VyZW1lbnQgLSBgaGVpZ2h0YCBvciBgd2lkdGhgXG4gKiBAYXJndW1lbnQge09iamVjdH0gcG9wcGVyT2Zmc2V0c1xuICogQGFyZ3VtZW50IHtPYmplY3R9IHJlZmVyZW5jZU9mZnNldHNcbiAqIEByZXR1cm5zIHtOdW1iZXJ8U3RyaW5nfVxuICogVmFsdWUgaW4gcGl4ZWxzLCBvciBvcmlnaW5hbCBzdHJpbmcgaWYgbm8gdmFsdWVzIHdlcmUgZXh0cmFjdGVkXG4gKi9cbmZ1bmN0aW9uIHRvVmFsdWUoc3RyLCBtZWFzdXJlbWVudCwgcG9wcGVyT2Zmc2V0cywgcmVmZXJlbmNlT2Zmc2V0cykge1xuICAvLyBzZXBhcmF0ZSB2YWx1ZSBmcm9tIHVuaXRcbiAgdmFyIHNwbGl0ID0gc3RyLm1hdGNoKC8oKD86XFwtfFxcKyk/XFxkKlxcLj9cXGQqKSguKikvKTtcbiAgdmFyIHZhbHVlID0gK3NwbGl0WzFdO1xuICB2YXIgdW5pdCA9IHNwbGl0WzJdO1xuXG4gIC8vIElmIGl0J3Mgbm90IGEgbnVtYmVyIGl0J3MgYW4gb3BlcmF0b3IsIEkgZ3Vlc3NcbiAgaWYgKCF2YWx1ZSkge1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBpZiAodW5pdC5pbmRleE9mKCclJykgPT09IDApIHtcbiAgICB2YXIgZWxlbWVudCA9IHZvaWQgMDtcbiAgICBzd2l0Y2ggKHVuaXQpIHtcbiAgICAgIGNhc2UgJyVwJzpcbiAgICAgICAgZWxlbWVudCA9IHBvcHBlck9mZnNldHM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnJSc6XG4gICAgICBjYXNlICclcic6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBlbGVtZW50ID0gcmVmZXJlbmNlT2Zmc2V0cztcbiAgICB9XG5cbiAgICB2YXIgcmVjdCA9IGdldENsaWVudFJlY3QoZWxlbWVudCk7XG4gICAgcmV0dXJuIHJlY3RbbWVhc3VyZW1lbnRdIC8gMTAwICogdmFsdWU7XG4gIH0gZWxzZSBpZiAodW5pdCA9PT0gJ3ZoJyB8fCB1bml0ID09PSAndncnKSB7XG4gICAgLy8gaWYgaXMgYSB2aCBvciB2dywgd2UgY2FsY3VsYXRlIHRoZSBzaXplIGJhc2VkIG9uIHRoZSB2aWV3cG9ydFxuICAgIHZhciBzaXplID0gdm9pZCAwO1xuICAgIGlmICh1bml0ID09PSAndmgnKSB7XG4gICAgICBzaXplID0gTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCwgd2luZG93LmlubmVySGVpZ2h0IHx8IDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaXplID0gTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoLCB3aW5kb3cuaW5uZXJXaWR0aCB8fCAwKTtcbiAgICB9XG4gICAgcmV0dXJuIHNpemUgLyAxMDAgKiB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICAvLyBpZiBpcyBhbiBleHBsaWNpdCBwaXhlbCB1bml0LCB3ZSBnZXQgcmlkIG9mIHRoZSB1bml0IGFuZCBrZWVwIHRoZSB2YWx1ZVxuICAgIC8vIGlmIGlzIGFuIGltcGxpY2l0IHVuaXQsIGl0J3MgcHgsIGFuZCB3ZSByZXR1cm4ganVzdCB0aGUgdmFsdWVcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhbiBgb2Zmc2V0YCBzdHJpbmcgdG8gZXh0cmFwb2xhdGUgYHhgIGFuZCBgeWAgbnVtZXJpYyBvZmZzZXRzLlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2Yge21vZGlmaWVyc35vZmZzZXR9XG4gKiBAcHJpdmF0ZVxuICogQGFyZ3VtZW50IHtTdHJpbmd9IG9mZnNldFxuICogQGFyZ3VtZW50IHtPYmplY3R9IHBvcHBlck9mZnNldHNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSByZWZlcmVuY2VPZmZzZXRzXG4gKiBAYXJndW1lbnQge1N0cmluZ30gYmFzZVBsYWNlbWVudFxuICogQHJldHVybnMge0FycmF5fSBhIHR3byBjZWxscyBhcnJheSB3aXRoIHggYW5kIHkgb2Zmc2V0cyBpbiBudW1iZXJzXG4gKi9cbmZ1bmN0aW9uIHBhcnNlT2Zmc2V0KG9mZnNldCwgcG9wcGVyT2Zmc2V0cywgcmVmZXJlbmNlT2Zmc2V0cywgYmFzZVBsYWNlbWVudCkge1xuICB2YXIgb2Zmc2V0cyA9IFswLCAwXTtcblxuICAvLyBVc2UgaGVpZ2h0IGlmIHBsYWNlbWVudCBpcyBsZWZ0IG9yIHJpZ2h0IGFuZCBpbmRleCBpcyAwIG90aGVyd2lzZSB1c2Ugd2lkdGhcbiAgLy8gaW4gdGhpcyB3YXkgdGhlIGZpcnN0IG9mZnNldCB3aWxsIHVzZSBhbiBheGlzIGFuZCB0aGUgc2Vjb25kIG9uZVxuICAvLyB3aWxsIHVzZSB0aGUgb3RoZXIgb25lXG4gIHZhciB1c2VIZWlnaHQgPSBbJ3JpZ2h0JywgJ2xlZnQnXS5pbmRleE9mKGJhc2VQbGFjZW1lbnQpICE9PSAtMTtcblxuICAvLyBTcGxpdCB0aGUgb2Zmc2V0IHN0cmluZyB0byBvYnRhaW4gYSBsaXN0IG9mIHZhbHVlcyBhbmQgb3BlcmFuZHNcbiAgLy8gVGhlIHJlZ2V4IGFkZHJlc3NlcyB2YWx1ZXMgd2l0aCB0aGUgcGx1cyBvciBtaW51cyBzaWduIGluIGZyb250ICgrMTAsIC0yMCwgZXRjKVxuICB2YXIgZnJhZ21lbnRzID0gb2Zmc2V0LnNwbGl0KC8oXFwrfFxcLSkvKS5tYXAoZnVuY3Rpb24gKGZyYWcpIHtcbiAgICByZXR1cm4gZnJhZy50cmltKCk7XG4gIH0pO1xuXG4gIC8vIERldGVjdCBpZiB0aGUgb2Zmc2V0IHN0cmluZyBjb250YWlucyBhIHBhaXIgb2YgdmFsdWVzIG9yIGEgc2luZ2xlIG9uZVxuICAvLyB0aGV5IGNvdWxkIGJlIHNlcGFyYXRlZCBieSBjb21tYSBvciBzcGFjZVxuICB2YXIgZGl2aWRlciA9IGZyYWdtZW50cy5pbmRleE9mKGZpbmQoZnJhZ21lbnRzLCBmdW5jdGlvbiAoZnJhZykge1xuICAgIHJldHVybiBmcmFnLnNlYXJjaCgvLHxcXHMvKSAhPT0gLTE7XG4gIH0pKTtcblxuICBpZiAoZnJhZ21lbnRzW2RpdmlkZXJdICYmIGZyYWdtZW50c1tkaXZpZGVyXS5pbmRleE9mKCcsJykgPT09IC0xKSB7XG4gICAgY29uc29sZS53YXJuKCdPZmZzZXRzIHNlcGFyYXRlZCBieSB3aGl0ZSBzcGFjZShzKSBhcmUgZGVwcmVjYXRlZCwgdXNlIGEgY29tbWEgKCwpIGluc3RlYWQuJyk7XG4gIH1cblxuICAvLyBJZiBkaXZpZGVyIGlzIGZvdW5kLCB3ZSBkaXZpZGUgdGhlIGxpc3Qgb2YgdmFsdWVzIGFuZCBvcGVyYW5kcyB0byBkaXZpZGVcbiAgLy8gdGhlbSBieSBvZnNldCBYIGFuZCBZLlxuICB2YXIgc3BsaXRSZWdleCA9IC9cXHMqLFxccyp8XFxzKy87XG4gIHZhciBvcHMgPSBkaXZpZGVyICE9PSAtMSA/IFtmcmFnbWVudHMuc2xpY2UoMCwgZGl2aWRlcikuY29uY2F0KFtmcmFnbWVudHNbZGl2aWRlcl0uc3BsaXQoc3BsaXRSZWdleClbMF1dKSwgW2ZyYWdtZW50c1tkaXZpZGVyXS5zcGxpdChzcGxpdFJlZ2V4KVsxXV0uY29uY2F0KGZyYWdtZW50cy5zbGljZShkaXZpZGVyICsgMSkpXSA6IFtmcmFnbWVudHNdO1xuXG4gIC8vIENvbnZlcnQgdGhlIHZhbHVlcyB3aXRoIHVuaXRzIHRvIGFic29sdXRlIHBpeGVscyB0byBhbGxvdyBvdXIgY29tcHV0YXRpb25zXG4gIG9wcyA9IG9wcy5tYXAoZnVuY3Rpb24gKG9wLCBpbmRleCkge1xuICAgIC8vIE1vc3Qgb2YgdGhlIHVuaXRzIHJlbHkgb24gdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBwb3BwZXJcbiAgICB2YXIgbWVhc3VyZW1lbnQgPSAoaW5kZXggPT09IDEgPyAhdXNlSGVpZ2h0IDogdXNlSGVpZ2h0KSA/ICdoZWlnaHQnIDogJ3dpZHRoJztcbiAgICB2YXIgbWVyZ2VXaXRoUHJldmlvdXMgPSBmYWxzZTtcbiAgICByZXR1cm4gb3BcbiAgICAvLyBUaGlzIGFnZ3JlZ2F0ZXMgYW55IGArYCBvciBgLWAgc2lnbiB0aGF0IGFyZW4ndCBjb25zaWRlcmVkIG9wZXJhdG9yc1xuICAgIC8vIGUuZy46IDEwICsgKzUgPT4gWzEwLCArLCArNV1cbiAgICAucmVkdWNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoYVthLmxlbmd0aCAtIDFdID09PSAnJyAmJiBbJysnLCAnLSddLmluZGV4T2YoYikgIT09IC0xKSB7XG4gICAgICAgIGFbYS5sZW5ndGggLSAxXSA9IGI7XG4gICAgICAgIG1lcmdlV2l0aFByZXZpb3VzID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgICB9IGVsc2UgaWYgKG1lcmdlV2l0aFByZXZpb3VzKSB7XG4gICAgICAgIGFbYS5sZW5ndGggLSAxXSArPSBiO1xuICAgICAgICBtZXJnZVdpdGhQcmV2aW91cyA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gYTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhLmNvbmNhdChiKTtcbiAgICAgIH1cbiAgICB9LCBbXSlcbiAgICAvLyBIZXJlIHdlIGNvbnZlcnQgdGhlIHN0cmluZyB2YWx1ZXMgaW50byBudW1iZXIgdmFsdWVzIChpbiBweClcbiAgICAubWFwKGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgIHJldHVybiB0b1ZhbHVlKHN0ciwgbWVhc3VyZW1lbnQsIHBvcHBlck9mZnNldHMsIHJlZmVyZW5jZU9mZnNldHMpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBMb29wIHRyb3VnaCB0aGUgb2Zmc2V0cyBhcnJheXMgYW5kIGV4ZWN1dGUgdGhlIG9wZXJhdGlvbnNcbiAgb3BzLmZvckVhY2goZnVuY3Rpb24gKG9wLCBpbmRleCkge1xuICAgIG9wLmZvckVhY2goZnVuY3Rpb24gKGZyYWcsIGluZGV4Mikge1xuICAgICAgaWYgKGlzTnVtZXJpYyhmcmFnKSkge1xuICAgICAgICBvZmZzZXRzW2luZGV4XSArPSBmcmFnICogKG9wW2luZGV4MiAtIDFdID09PSAnLScgPyAtMSA6IDEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIG9mZnNldHM7XG59XG5cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2YgTW9kaWZpZXJzXG4gKiBAYXJndW1lbnQge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgdXBkYXRlIG1ldGhvZFxuICogQGFyZ3VtZW50IHtPYmplY3R9IG9wdGlvbnMgLSBNb2RpZmllcnMgY29uZmlndXJhdGlvbiBhbmQgb3B0aW9uc1xuICogQGFyZ3VtZW50IHtOdW1iZXJ8U3RyaW5nfSBvcHRpb25zLm9mZnNldD0wXG4gKiBUaGUgb2Zmc2V0IHZhbHVlIGFzIGRlc2NyaWJlZCBpbiB0aGUgbW9kaWZpZXIgZGVzY3JpcHRpb25cbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gb2Zmc2V0KGRhdGEsIF9yZWYpIHtcbiAgdmFyIG9mZnNldCA9IF9yZWYub2Zmc2V0O1xuICB2YXIgcGxhY2VtZW50ID0gZGF0YS5wbGFjZW1lbnQsXG4gICAgICBfZGF0YSRvZmZzZXRzID0gZGF0YS5vZmZzZXRzLFxuICAgICAgcG9wcGVyID0gX2RhdGEkb2Zmc2V0cy5wb3BwZXIsXG4gICAgICByZWZlcmVuY2UgPSBfZGF0YSRvZmZzZXRzLnJlZmVyZW5jZTtcblxuICB2YXIgYmFzZVBsYWNlbWVudCA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuXG4gIHZhciBvZmZzZXRzID0gdm9pZCAwO1xuICBpZiAoaXNOdW1lcmljKCtvZmZzZXQpKSB7XG4gICAgb2Zmc2V0cyA9IFsrb2Zmc2V0LCAwXTtcbiAgfSBlbHNlIHtcbiAgICBvZmZzZXRzID0gcGFyc2VPZmZzZXQob2Zmc2V0LCBwb3BwZXIsIHJlZmVyZW5jZSwgYmFzZVBsYWNlbWVudCk7XG4gIH1cblxuICBpZiAoYmFzZVBsYWNlbWVudCA9PT0gJ2xlZnQnKSB7XG4gICAgcG9wcGVyLnRvcCArPSBvZmZzZXRzWzBdO1xuICAgIHBvcHBlci5sZWZ0IC09IG9mZnNldHNbMV07XG4gIH0gZWxzZSBpZiAoYmFzZVBsYWNlbWVudCA9PT0gJ3JpZ2h0Jykge1xuICAgIHBvcHBlci50b3AgKz0gb2Zmc2V0c1swXTtcbiAgICBwb3BwZXIubGVmdCArPSBvZmZzZXRzWzFdO1xuICB9IGVsc2UgaWYgKGJhc2VQbGFjZW1lbnQgPT09ICd0b3AnKSB7XG4gICAgcG9wcGVyLmxlZnQgKz0gb2Zmc2V0c1swXTtcbiAgICBwb3BwZXIudG9wIC09IG9mZnNldHNbMV07XG4gIH0gZWxzZSBpZiAoYmFzZVBsYWNlbWVudCA9PT0gJ2JvdHRvbScpIHtcbiAgICBwb3BwZXIubGVmdCArPSBvZmZzZXRzWzBdO1xuICAgIHBvcHBlci50b3AgKz0gb2Zmc2V0c1sxXTtcbiAgfVxuXG4gIGRhdGEucG9wcGVyID0gcG9wcGVyO1xuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSBgdXBkYXRlYCBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gcHJldmVudE92ZXJmbG93KGRhdGEsIG9wdGlvbnMpIHtcbiAgdmFyIGJvdW5kYXJpZXNFbGVtZW50ID0gb3B0aW9ucy5ib3VuZGFyaWVzRWxlbWVudCB8fCBnZXRPZmZzZXRQYXJlbnQoZGF0YS5pbnN0YW5jZS5wb3BwZXIpO1xuXG4gIC8vIElmIG9mZnNldFBhcmVudCBpcyB0aGUgcmVmZXJlbmNlIGVsZW1lbnQsIHdlIHJlYWxseSB3YW50IHRvXG4gIC8vIGdvIG9uZSBzdGVwIHVwIGFuZCB1c2UgdGhlIG5leHQgb2Zmc2V0UGFyZW50IGFzIHJlZmVyZW5jZSB0b1xuICAvLyBhdm9pZCB0byBtYWtlIHRoaXMgbW9kaWZpZXIgY29tcGxldGVseSB1c2VsZXNzIGFuZCBsb29rIGxpa2UgYnJva2VuXG4gIGlmIChkYXRhLmluc3RhbmNlLnJlZmVyZW5jZSA9PT0gYm91bmRhcmllc0VsZW1lbnQpIHtcbiAgICBib3VuZGFyaWVzRWxlbWVudCA9IGdldE9mZnNldFBhcmVudChib3VuZGFyaWVzRWxlbWVudCk7XG4gIH1cblxuICAvLyBOT1RFOiBET00gYWNjZXNzIGhlcmVcbiAgLy8gcmVzZXRzIHRoZSBwb3BwZXIncyBwb3NpdGlvbiBzbyB0aGF0IHRoZSBkb2N1bWVudCBzaXplIGNhbiBiZSBjYWxjdWxhdGVkIGV4Y2x1ZGluZ1xuICAvLyB0aGUgc2l6ZSBvZiB0aGUgcG9wcGVyIGVsZW1lbnQgaXRzZWxmXG4gIHZhciB0cmFuc2Zvcm1Qcm9wID0gZ2V0U3VwcG9ydGVkUHJvcGVydHlOYW1lKCd0cmFuc2Zvcm0nKTtcbiAgdmFyIHBvcHBlclN0eWxlcyA9IGRhdGEuaW5zdGFuY2UucG9wcGVyLnN0eWxlOyAvLyBhc3NpZ25tZW50IHRvIGhlbHAgbWluaWZpY2F0aW9uXG4gIHZhciB0b3AgPSBwb3BwZXJTdHlsZXMudG9wLFxuICAgICAgbGVmdCA9IHBvcHBlclN0eWxlcy5sZWZ0LFxuICAgICAgdHJhbnNmb3JtID0gcG9wcGVyU3R5bGVzW3RyYW5zZm9ybVByb3BdO1xuXG4gIHBvcHBlclN0eWxlcy50b3AgPSAnJztcbiAgcG9wcGVyU3R5bGVzLmxlZnQgPSAnJztcbiAgcG9wcGVyU3R5bGVzW3RyYW5zZm9ybVByb3BdID0gJyc7XG5cbiAgdmFyIGJvdW5kYXJpZXMgPSBnZXRCb3VuZGFyaWVzKGRhdGEuaW5zdGFuY2UucG9wcGVyLCBkYXRhLmluc3RhbmNlLnJlZmVyZW5jZSwgb3B0aW9ucy5wYWRkaW5nLCBib3VuZGFyaWVzRWxlbWVudCwgZGF0YS5wb3NpdGlvbkZpeGVkKTtcblxuICAvLyBOT1RFOiBET00gYWNjZXNzIGhlcmVcbiAgLy8gcmVzdG9yZXMgdGhlIG9yaWdpbmFsIHN0eWxlIHByb3BlcnRpZXMgYWZ0ZXIgdGhlIG9mZnNldHMgaGF2ZSBiZWVuIGNvbXB1dGVkXG4gIHBvcHBlclN0eWxlcy50b3AgPSB0b3A7XG4gIHBvcHBlclN0eWxlcy5sZWZ0ID0gbGVmdDtcbiAgcG9wcGVyU3R5bGVzW3RyYW5zZm9ybVByb3BdID0gdHJhbnNmb3JtO1xuXG4gIG9wdGlvbnMuYm91bmRhcmllcyA9IGJvdW5kYXJpZXM7XG5cbiAgdmFyIG9yZGVyID0gb3B0aW9ucy5wcmlvcml0eTtcbiAgdmFyIHBvcHBlciA9IGRhdGEub2Zmc2V0cy5wb3BwZXI7XG5cbiAgdmFyIGNoZWNrID0ge1xuICAgIHByaW1hcnk6IGZ1bmN0aW9uIHByaW1hcnkocGxhY2VtZW50KSB7XG4gICAgICB2YXIgdmFsdWUgPSBwb3BwZXJbcGxhY2VtZW50XTtcbiAgICAgIGlmIChwb3BwZXJbcGxhY2VtZW50XSA8IGJvdW5kYXJpZXNbcGxhY2VtZW50XSAmJiAhb3B0aW9ucy5lc2NhcGVXaXRoUmVmZXJlbmNlKSB7XG4gICAgICAgIHZhbHVlID0gTWF0aC5tYXgocG9wcGVyW3BsYWNlbWVudF0sIGJvdW5kYXJpZXNbcGxhY2VtZW50XSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkoe30sIHBsYWNlbWVudCwgdmFsdWUpO1xuICAgIH0sXG4gICAgc2Vjb25kYXJ5OiBmdW5jdGlvbiBzZWNvbmRhcnkocGxhY2VtZW50KSB7XG4gICAgICB2YXIgbWFpblNpZGUgPSBwbGFjZW1lbnQgPT09ICdyaWdodCcgPyAnbGVmdCcgOiAndG9wJztcbiAgICAgIHZhciB2YWx1ZSA9IHBvcHBlclttYWluU2lkZV07XG4gICAgICBpZiAocG9wcGVyW3BsYWNlbWVudF0gPiBib3VuZGFyaWVzW3BsYWNlbWVudF0gJiYgIW9wdGlvbnMuZXNjYXBlV2l0aFJlZmVyZW5jZSkge1xuICAgICAgICB2YWx1ZSA9IE1hdGgubWluKHBvcHBlclttYWluU2lkZV0sIGJvdW5kYXJpZXNbcGxhY2VtZW50XSAtIChwbGFjZW1lbnQgPT09ICdyaWdodCcgPyBwb3BwZXIud2lkdGggOiBwb3BwZXIuaGVpZ2h0KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkoe30sIG1haW5TaWRlLCB2YWx1ZSk7XG4gICAgfVxuICB9O1xuXG4gIG9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHBsYWNlbWVudCkge1xuICAgIHZhciBzaWRlID0gWydsZWZ0JywgJ3RvcCddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTEgPyAncHJpbWFyeScgOiAnc2Vjb25kYXJ5JztcbiAgICBwb3BwZXIgPSBfZXh0ZW5kcyh7fSwgcG9wcGVyLCBjaGVja1tzaWRlXShwbGFjZW1lbnQpKTtcbiAgfSk7XG5cbiAgZGF0YS5vZmZzZXRzLnBvcHBlciA9IHBvcHBlcjtcblxuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSBgdXBkYXRlYCBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gc2hpZnQoZGF0YSkge1xuICB2YXIgcGxhY2VtZW50ID0gZGF0YS5wbGFjZW1lbnQ7XG4gIHZhciBiYXNlUGxhY2VtZW50ID0gcGxhY2VtZW50LnNwbGl0KCctJylbMF07XG4gIHZhciBzaGlmdHZhcmlhdGlvbiA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzFdO1xuXG4gIC8vIGlmIHNoaWZ0IHNoaWZ0dmFyaWF0aW9uIGlzIHNwZWNpZmllZCwgcnVuIHRoZSBtb2RpZmllclxuICBpZiAoc2hpZnR2YXJpYXRpb24pIHtcbiAgICB2YXIgX2RhdGEkb2Zmc2V0cyA9IGRhdGEub2Zmc2V0cyxcbiAgICAgICAgcmVmZXJlbmNlID0gX2RhdGEkb2Zmc2V0cy5yZWZlcmVuY2UsXG4gICAgICAgIHBvcHBlciA9IF9kYXRhJG9mZnNldHMucG9wcGVyO1xuXG4gICAgdmFyIGlzVmVydGljYWwgPSBbJ2JvdHRvbScsICd0b3AnXS5pbmRleE9mKGJhc2VQbGFjZW1lbnQpICE9PSAtMTtcbiAgICB2YXIgc2lkZSA9IGlzVmVydGljYWwgPyAnbGVmdCcgOiAndG9wJztcbiAgICB2YXIgbWVhc3VyZW1lbnQgPSBpc1ZlcnRpY2FsID8gJ3dpZHRoJyA6ICdoZWlnaHQnO1xuXG4gICAgdmFyIHNoaWZ0T2Zmc2V0cyA9IHtcbiAgICAgIHN0YXJ0OiBkZWZpbmVQcm9wZXJ0eSh7fSwgc2lkZSwgcmVmZXJlbmNlW3NpZGVdKSxcbiAgICAgIGVuZDogZGVmaW5lUHJvcGVydHkoe30sIHNpZGUsIHJlZmVyZW5jZVtzaWRlXSArIHJlZmVyZW5jZVttZWFzdXJlbWVudF0gLSBwb3BwZXJbbWVhc3VyZW1lbnRdKVxuICAgIH07XG5cbiAgICBkYXRhLm9mZnNldHMucG9wcGVyID0gX2V4dGVuZHMoe30sIHBvcHBlciwgc2hpZnRPZmZzZXRzW3NoaWZ0dmFyaWF0aW9uXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSB1cGRhdGUgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZGF0YSBvYmplY3QsIHByb3Blcmx5IG1vZGlmaWVkXG4gKi9cbmZ1bmN0aW9uIGhpZGUoZGF0YSkge1xuICBpZiAoIWlzTW9kaWZpZXJSZXF1aXJlZChkYXRhLmluc3RhbmNlLm1vZGlmaWVycywgJ2hpZGUnLCAncHJldmVudE92ZXJmbG93JykpIHtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciByZWZSZWN0ID0gZGF0YS5vZmZzZXRzLnJlZmVyZW5jZTtcbiAgdmFyIGJvdW5kID0gZmluZChkYXRhLmluc3RhbmNlLm1vZGlmaWVycywgZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gICAgcmV0dXJuIG1vZGlmaWVyLm5hbWUgPT09ICdwcmV2ZW50T3ZlcmZsb3cnO1xuICB9KS5ib3VuZGFyaWVzO1xuXG4gIGlmIChyZWZSZWN0LmJvdHRvbSA8IGJvdW5kLnRvcCB8fCByZWZSZWN0LmxlZnQgPiBib3VuZC5yaWdodCB8fCByZWZSZWN0LnRvcCA+IGJvdW5kLmJvdHRvbSB8fCByZWZSZWN0LnJpZ2h0IDwgYm91bmQubGVmdCkge1xuICAgIC8vIEF2b2lkIHVubmVjZXNzYXJ5IERPTSBhY2Nlc3MgaWYgdmlzaWJpbGl0eSBoYXNuJ3QgY2hhbmdlZFxuICAgIGlmIChkYXRhLmhpZGUgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIGRhdGEuaGlkZSA9IHRydWU7XG4gICAgZGF0YS5hdHRyaWJ1dGVzWyd4LW91dC1vZi1ib3VuZGFyaWVzJ10gPSAnJztcbiAgfSBlbHNlIHtcbiAgICAvLyBBdm9pZCB1bm5lY2Vzc2FyeSBET00gYWNjZXNzIGlmIHZpc2liaWxpdHkgaGFzbid0IGNoYW5nZWRcbiAgICBpZiAoZGF0YS5oaWRlID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgZGF0YS5oaWRlID0gZmFsc2U7XG4gICAgZGF0YS5hdHRyaWJ1dGVzWyd4LW91dC1vZi1ib3VuZGFyaWVzJ10gPSBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IGB1cGRhdGVgIG1ldGhvZFxuICogQGFyZ3VtZW50IHtPYmplY3R9IG9wdGlvbnMgLSBNb2RpZmllcnMgY29uZmlndXJhdGlvbiBhbmQgb3B0aW9uc1xuICogQHJldHVybnMge09iamVjdH0gVGhlIGRhdGEgb2JqZWN0LCBwcm9wZXJseSBtb2RpZmllZFxuICovXG5mdW5jdGlvbiBpbm5lcihkYXRhKSB7XG4gIHZhciBwbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudDtcbiAgdmFyIGJhc2VQbGFjZW1lbnQgPSBwbGFjZW1lbnQuc3BsaXQoJy0nKVswXTtcbiAgdmFyIF9kYXRhJG9mZnNldHMgPSBkYXRhLm9mZnNldHMsXG4gICAgICBwb3BwZXIgPSBfZGF0YSRvZmZzZXRzLnBvcHBlcixcbiAgICAgIHJlZmVyZW5jZSA9IF9kYXRhJG9mZnNldHMucmVmZXJlbmNlO1xuXG4gIHZhciBpc0hvcml6ID0gWydsZWZ0JywgJ3JpZ2h0J10uaW5kZXhPZihiYXNlUGxhY2VtZW50KSAhPT0gLTE7XG5cbiAgdmFyIHN1YnRyYWN0TGVuZ3RoID0gWyd0b3AnLCAnbGVmdCddLmluZGV4T2YoYmFzZVBsYWNlbWVudCkgPT09IC0xO1xuXG4gIHBvcHBlcltpc0hvcml6ID8gJ2xlZnQnIDogJ3RvcCddID0gcmVmZXJlbmNlW2Jhc2VQbGFjZW1lbnRdIC0gKHN1YnRyYWN0TGVuZ3RoID8gcG9wcGVyW2lzSG9yaXogPyAnd2lkdGgnIDogJ2hlaWdodCddIDogMCk7XG5cbiAgZGF0YS5wbGFjZW1lbnQgPSBnZXRPcHBvc2l0ZVBsYWNlbWVudChwbGFjZW1lbnQpO1xuICBkYXRhLm9mZnNldHMucG9wcGVyID0gZ2V0Q2xpZW50UmVjdChwb3BwZXIpO1xuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIE1vZGlmaWVyIGZ1bmN0aW9uLCBlYWNoIG1vZGlmaWVyIGNhbiBoYXZlIGEgZnVuY3Rpb24gb2YgdGhpcyB0eXBlIGFzc2lnbmVkXG4gKiB0byBpdHMgYGZuYCBwcm9wZXJ0eS48YnIgLz5cbiAqIFRoZXNlIGZ1bmN0aW9ucyB3aWxsIGJlIGNhbGxlZCBvbiBlYWNoIHVwZGF0ZSwgdGhpcyBtZWFucyB0aGF0IHlvdSBtdXN0XG4gKiBtYWtlIHN1cmUgdGhleSBhcmUgcGVyZm9ybWFudCBlbm91Z2ggdG8gYXZvaWQgcGVyZm9ybWFuY2UgYm90dGxlbmVja3MuXG4gKlxuICogQGZ1bmN0aW9uIE1vZGlmaWVyRm5cbiAqIEBhcmd1bWVudCB7ZGF0YU9iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgYHVwZGF0ZWAgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7ZGF0YU9iamVjdH0gVGhlIGRhdGEgb2JqZWN0LCBwcm9wZXJseSBtb2RpZmllZFxuICovXG5cbi8qKlxuICogTW9kaWZpZXJzIGFyZSBwbHVnaW5zIHVzZWQgdG8gYWx0ZXIgdGhlIGJlaGF2aW9yIG9mIHlvdXIgcG9wcGVycy48YnIgLz5cbiAqIFBvcHBlci5qcyB1c2VzIGEgc2V0IG9mIDkgbW9kaWZpZXJzIHRvIHByb3ZpZGUgYWxsIHRoZSBiYXNpYyBmdW5jdGlvbmFsaXRpZXNcbiAqIG5lZWRlZCBieSB0aGUgbGlicmFyeS5cbiAqXG4gKiBVc3VhbGx5IHlvdSBkb24ndCB3YW50IHRvIG92ZXJyaWRlIHRoZSBgb3JkZXJgLCBgZm5gIGFuZCBgb25Mb2FkYCBwcm9wcy5cbiAqIEFsbCB0aGUgb3RoZXIgcHJvcGVydGllcyBhcmUgY29uZmlndXJhdGlvbnMgdGhhdCBjb3VsZCBiZSB0d2Vha2VkLlxuICogQG5hbWVzcGFjZSBtb2RpZmllcnNcbiAqL1xudmFyIG1vZGlmaWVycyA9IHtcbiAgLyoqXG4gICAqIE1vZGlmaWVyIHVzZWQgdG8gc2hpZnQgdGhlIHBvcHBlciBvbiB0aGUgc3RhcnQgb3IgZW5kIG9mIGl0cyByZWZlcmVuY2VcbiAgICogZWxlbWVudC48YnIgLz5cbiAgICogSXQgd2lsbCByZWFkIHRoZSB2YXJpYXRpb24gb2YgdGhlIGBwbGFjZW1lbnRgIHByb3BlcnR5LjxiciAvPlxuICAgKiBJdCBjYW4gYmUgb25lIGVpdGhlciBgLWVuZGAgb3IgYC1zdGFydGAuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBzaGlmdDoge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj0xMDAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDEwMCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9dHJ1ZSAtIFdoZXRoZXIgdGhlIG1vZGlmaWVyIGlzIGVuYWJsZWQgb3Igbm90ICovXG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAvKiogQHByb3Age01vZGlmaWVyRm59ICovXG4gICAgZm46IHNoaWZ0XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoZSBgb2Zmc2V0YCBtb2RpZmllciBjYW4gc2hpZnQgeW91ciBwb3BwZXIgb24gYm90aCBpdHMgYXhpcy5cbiAgICpcbiAgICogSXQgYWNjZXB0cyB0aGUgZm9sbG93aW5nIHVuaXRzOlxuICAgKiAtIGBweGAgb3IgdW5pdC1sZXNzLCBpbnRlcnByZXRlZCBhcyBwaXhlbHNcbiAgICogLSBgJWAgb3IgYCVyYCwgcGVyY2VudGFnZSByZWxhdGl2ZSB0byB0aGUgbGVuZ3RoIG9mIHRoZSByZWZlcmVuY2UgZWxlbWVudFxuICAgKiAtIGAlcGAsIHBlcmNlbnRhZ2UgcmVsYXRpdmUgdG8gdGhlIGxlbmd0aCBvZiB0aGUgcG9wcGVyIGVsZW1lbnRcbiAgICogLSBgdndgLCBDU1Mgdmlld3BvcnQgd2lkdGggdW5pdFxuICAgKiAtIGB2aGAsIENTUyB2aWV3cG9ydCBoZWlnaHQgdW5pdFxuICAgKlxuICAgKiBGb3IgbGVuZ3RoIGlzIGludGVuZGVkIHRoZSBtYWluIGF4aXMgcmVsYXRpdmUgdG8gdGhlIHBsYWNlbWVudCBvZiB0aGUgcG9wcGVyLjxiciAvPlxuICAgKiBUaGlzIG1lYW5zIHRoYXQgaWYgdGhlIHBsYWNlbWVudCBpcyBgdG9wYCBvciBgYm90dG9tYCwgdGhlIGxlbmd0aCB3aWxsIGJlIHRoZVxuICAgKiBgd2lkdGhgLiBJbiBjYXNlIG9mIGBsZWZ0YCBvciBgcmlnaHRgLCBpdCB3aWxsIGJlIHRoZSBgaGVpZ2h0YC5cbiAgICpcbiAgICogWW91IGNhbiBwcm92aWRlIGEgc2luZ2xlIHZhbHVlIChhcyBgTnVtYmVyYCBvciBgU3RyaW5nYCksIG9yIGEgcGFpciBvZiB2YWx1ZXNcbiAgICogYXMgYFN0cmluZ2AgZGl2aWRlZCBieSBhIGNvbW1hIG9yIG9uZSAob3IgbW9yZSkgd2hpdGUgc3BhY2VzLjxiciAvPlxuICAgKiBUaGUgbGF0dGVyIGlzIGEgZGVwcmVjYXRlZCBtZXRob2QgYmVjYXVzZSBpdCBsZWFkcyB0byBjb25mdXNpb24gYW5kIHdpbGwgYmVcbiAgICogcmVtb3ZlZCBpbiB2Mi48YnIgLz5cbiAgICogQWRkaXRpb25hbGx5LCBpdCBhY2NlcHRzIGFkZGl0aW9ucyBhbmQgc3VidHJhY3Rpb25zIGJldHdlZW4gZGlmZmVyZW50IHVuaXRzLlxuICAgKiBOb3RlIHRoYXQgbXVsdGlwbGljYXRpb25zIGFuZCBkaXZpc2lvbnMgYXJlbid0IHN1cHBvcnRlZC5cbiAgICpcbiAgICogVmFsaWQgZXhhbXBsZXMgYXJlOlxuICAgKiBgYGBcbiAgICogMTBcbiAgICogJzEwJSdcbiAgICogJzEwLCAxMCdcbiAgICogJzEwJSwgMTAnXG4gICAqICcxMCArIDEwJSdcbiAgICogJzEwIC0gNXZoICsgMyUnXG4gICAqICctMTBweCArIDV2aCwgNXB4IC0gNiUnXG4gICAqIGBgYFxuICAgKiA+ICoqTkIqKjogSWYgeW91IGRlc2lyZSB0byBhcHBseSBvZmZzZXRzIHRvIHlvdXIgcG9wcGVycyBpbiBhIHdheSB0aGF0IG1heSBtYWtlIHRoZW0gb3ZlcmxhcFxuICAgKiA+IHdpdGggdGhlaXIgcmVmZXJlbmNlIGVsZW1lbnQsIHVuZm9ydHVuYXRlbHksIHlvdSB3aWxsIGhhdmUgdG8gZGlzYWJsZSB0aGUgYGZsaXBgIG1vZGlmaWVyLlxuICAgKiA+IFlvdSBjYW4gcmVhZCBtb3JlIG9uIHRoaXMgYXQgdGhpcyBbaXNzdWVdKGh0dHBzOi8vZ2l0aHViLmNvbS9GZXpWcmFzdGEvcG9wcGVyLmpzL2lzc3Vlcy8zNzMpLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgbW9kaWZpZXJzXG4gICAqIEBpbm5lclxuICAgKi9cbiAgb2Zmc2V0OiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTIwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogMjAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogb2Zmc2V0LFxuICAgIC8qKiBAcHJvcCB7TnVtYmVyfFN0cmluZ30gb2Zmc2V0PTBcbiAgICAgKiBUaGUgb2Zmc2V0IHZhbHVlIGFzIGRlc2NyaWJlZCBpbiB0aGUgbW9kaWZpZXIgZGVzY3JpcHRpb25cbiAgICAgKi9cbiAgICBvZmZzZXQ6IDBcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBwcmV2ZW50IHRoZSBwb3BwZXIgZnJvbSBiZWluZyBwb3NpdGlvbmVkIG91dHNpZGUgdGhlIGJvdW5kYXJ5LlxuICAgKlxuICAgKiBBIHNjZW5hcmlvIGV4aXN0cyB3aGVyZSB0aGUgcmVmZXJlbmNlIGl0c2VsZiBpcyBub3Qgd2l0aGluIHRoZSBib3VuZGFyaWVzLjxiciAvPlxuICAgKiBXZSBjYW4gc2F5IGl0IGhhcyBcImVzY2FwZWQgdGhlIGJvdW5kYXJpZXNcIiDigJQgb3IganVzdCBcImVzY2FwZWRcIi48YnIgLz5cbiAgICogSW4gdGhpcyBjYXNlIHdlIG5lZWQgdG8gZGVjaWRlIHdoZXRoZXIgdGhlIHBvcHBlciBzaG91bGQgZWl0aGVyOlxuICAgKlxuICAgKiAtIGRldGFjaCBmcm9tIHRoZSByZWZlcmVuY2UgYW5kIHJlbWFpbiBcInRyYXBwZWRcIiBpbiB0aGUgYm91bmRhcmllcywgb3JcbiAgICogLSBpZiBpdCBzaG91bGQgaWdub3JlIHRoZSBib3VuZGFyeSBhbmQgXCJlc2NhcGUgd2l0aCBpdHMgcmVmZXJlbmNlXCJcbiAgICpcbiAgICogV2hlbiBgZXNjYXBlV2l0aFJlZmVyZW5jZWAgaXMgc2V0IHRvYHRydWVgIGFuZCByZWZlcmVuY2UgaXMgY29tcGxldGVseVxuICAgKiBvdXRzaWRlIGl0cyBib3VuZGFyaWVzLCB0aGUgcG9wcGVyIHdpbGwgb3ZlcmZsb3cgKG9yIGNvbXBsZXRlbHkgbGVhdmUpXG4gICAqIHRoZSBib3VuZGFyaWVzIGluIG9yZGVyIHRvIHJlbWFpbiBhdHRhY2hlZCB0byB0aGUgZWRnZSBvZiB0aGUgcmVmZXJlbmNlLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgbW9kaWZpZXJzXG4gICAqIEBpbm5lclxuICAgKi9cbiAgcHJldmVudE92ZXJmbG93OiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTMwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogMzAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogcHJldmVudE92ZXJmbG93LFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtBcnJheX0gW3ByaW9yaXR5PVsnbGVmdCcsJ3JpZ2h0JywndG9wJywnYm90dG9tJ11dXG4gICAgICogUG9wcGVyIHdpbGwgdHJ5IHRvIHByZXZlbnQgb3ZlcmZsb3cgZm9sbG93aW5nIHRoZXNlIHByaW9yaXRpZXMgYnkgZGVmYXVsdCxcbiAgICAgKiB0aGVuLCBpdCBjb3VsZCBvdmVyZmxvdyBvbiB0aGUgbGVmdCBhbmQgb24gdG9wIG9mIHRoZSBgYm91bmRhcmllc0VsZW1lbnRgXG4gICAgICovXG4gICAgcHJpb3JpdHk6IFsnbGVmdCcsICdyaWdodCcsICd0b3AnLCAnYm90dG9tJ10sXG4gICAgLyoqXG4gICAgICogQHByb3Age251bWJlcn0gcGFkZGluZz01XG4gICAgICogQW1vdW50IG9mIHBpeGVsIHVzZWQgdG8gZGVmaW5lIGEgbWluaW11bSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBib3VuZGFyaWVzXG4gICAgICogYW5kIHRoZSBwb3BwZXIuIFRoaXMgbWFrZXMgc3VyZSB0aGUgcG9wcGVyIGFsd2F5cyBoYXMgYSBsaXR0bGUgcGFkZGluZ1xuICAgICAqIGJldHdlZW4gdGhlIGVkZ2VzIG9mIGl0cyBjb250YWluZXJcbiAgICAgKi9cbiAgICBwYWRkaW5nOiA1LFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtTdHJpbmd8SFRNTEVsZW1lbnR9IGJvdW5kYXJpZXNFbGVtZW50PSdzY3JvbGxQYXJlbnQnXG4gICAgICogQm91bmRhcmllcyB1c2VkIGJ5IHRoZSBtb2RpZmllci4gQ2FuIGJlIGBzY3JvbGxQYXJlbnRgLCBgd2luZG93YCxcbiAgICAgKiBgdmlld3BvcnRgIG9yIGFueSBET00gZWxlbWVudC5cbiAgICAgKi9cbiAgICBib3VuZGFyaWVzRWxlbWVudDogJ3Njcm9sbFBhcmVudCdcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBtYWtlIHN1cmUgdGhlIHJlZmVyZW5jZSBhbmQgaXRzIHBvcHBlciBzdGF5IG5lYXIgZWFjaCBvdGhlclxuICAgKiB3aXRob3V0IGxlYXZpbmcgYW55IGdhcCBiZXR3ZWVuIHRoZSB0d28uIEVzcGVjaWFsbHkgdXNlZnVsIHdoZW4gdGhlIGFycm93IGlzXG4gICAqIGVuYWJsZWQgYW5kIHlvdSB3YW50IHRvIGVuc3VyZSB0aGF0IGl0IHBvaW50cyB0byBpdHMgcmVmZXJlbmNlIGVsZW1lbnQuXG4gICAqIEl0IGNhcmVzIG9ubHkgYWJvdXQgdGhlIGZpcnN0IGF4aXMuIFlvdSBjYW4gc3RpbGwgaGF2ZSBwb3BwZXJzIHdpdGggbWFyZ2luXG4gICAqIGJldHdlZW4gdGhlIHBvcHBlciBhbmQgaXRzIHJlZmVyZW5jZSBlbGVtZW50LlxuICAgKiBAbWVtYmVyb2YgbW9kaWZpZXJzXG4gICAqIEBpbm5lclxuICAgKi9cbiAga2VlcFRvZ2V0aGVyOiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTQwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogNDAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjoga2VlcFRvZ2V0aGVyXG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoaXMgbW9kaWZpZXIgaXMgdXNlZCB0byBtb3ZlIHRoZSBgYXJyb3dFbGVtZW50YCBvZiB0aGUgcG9wcGVyIHRvIG1ha2VcbiAgICogc3VyZSBpdCBpcyBwb3NpdGlvbmVkIGJldHdlZW4gdGhlIHJlZmVyZW5jZSBlbGVtZW50IGFuZCBpdHMgcG9wcGVyIGVsZW1lbnQuXG4gICAqIEl0IHdpbGwgcmVhZCB0aGUgb3V0ZXIgc2l6ZSBvZiB0aGUgYGFycm93RWxlbWVudGAgbm9kZSB0byBkZXRlY3QgaG93IG1hbnlcbiAgICogcGl4ZWxzIG9mIGNvbmp1bmN0aW9uIGFyZSBuZWVkZWQuXG4gICAqXG4gICAqIEl0IGhhcyBubyBlZmZlY3QgaWYgbm8gYGFycm93RWxlbWVudGAgaXMgcHJvdmlkZWQuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBhcnJvdzoge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj01MDAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDUwMCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9dHJ1ZSAtIFdoZXRoZXIgdGhlIG1vZGlmaWVyIGlzIGVuYWJsZWQgb3Igbm90ICovXG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAvKiogQHByb3Age01vZGlmaWVyRm59ICovXG4gICAgZm46IGFycm93LFxuICAgIC8qKiBAcHJvcCB7U3RyaW5nfEhUTUxFbGVtZW50fSBlbGVtZW50PSdbeC1hcnJvd10nIC0gU2VsZWN0b3Igb3Igbm9kZSB1c2VkIGFzIGFycm93ICovXG4gICAgZWxlbWVudDogJ1t4LWFycm93XSdcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBmbGlwIHRoZSBwb3BwZXIncyBwbGFjZW1lbnQgd2hlbiBpdCBzdGFydHMgdG8gb3ZlcmxhcCBpdHNcbiAgICogcmVmZXJlbmNlIGVsZW1lbnQuXG4gICAqXG4gICAqIFJlcXVpcmVzIHRoZSBgcHJldmVudE92ZXJmbG93YCBtb2RpZmllciBiZWZvcmUgaXQgaW4gb3JkZXIgdG8gd29yay5cbiAgICpcbiAgICogKipOT1RFOioqIHRoaXMgbW9kaWZpZXIgd2lsbCBpbnRlcnJ1cHQgdGhlIGN1cnJlbnQgdXBkYXRlIGN5Y2xlIGFuZCB3aWxsXG4gICAqIHJlc3RhcnQgaXQgaWYgaXQgZGV0ZWN0cyB0aGUgbmVlZCB0byBmbGlwIHRoZSBwbGFjZW1lbnQuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBmbGlwOiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTYwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogNjAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogZmxpcCxcbiAgICAvKipcbiAgICAgKiBAcHJvcCB7U3RyaW5nfEFycmF5fSBiZWhhdmlvcj0nZmxpcCdcbiAgICAgKiBUaGUgYmVoYXZpb3IgdXNlZCB0byBjaGFuZ2UgdGhlIHBvcHBlcidzIHBsYWNlbWVudC4gSXQgY2FuIGJlIG9uZSBvZlxuICAgICAqIGBmbGlwYCwgYGNsb2Nrd2lzZWAsIGBjb3VudGVyY2xvY2t3aXNlYCBvciBhbiBhcnJheSB3aXRoIGEgbGlzdCBvZiB2YWxpZFxuICAgICAqIHBsYWNlbWVudHMgKHdpdGggb3B0aW9uYWwgdmFyaWF0aW9ucylcbiAgICAgKi9cbiAgICBiZWhhdmlvcjogJ2ZsaXAnLFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtudW1iZXJ9IHBhZGRpbmc9NVxuICAgICAqIFRoZSBwb3BwZXIgd2lsbCBmbGlwIGlmIGl0IGhpdHMgdGhlIGVkZ2VzIG9mIHRoZSBgYm91bmRhcmllc0VsZW1lbnRgXG4gICAgICovXG4gICAgcGFkZGluZzogNSxcbiAgICAvKipcbiAgICAgKiBAcHJvcCB7U3RyaW5nfEhUTUxFbGVtZW50fSBib3VuZGFyaWVzRWxlbWVudD0ndmlld3BvcnQnXG4gICAgICogVGhlIGVsZW1lbnQgd2hpY2ggd2lsbCBkZWZpbmUgdGhlIGJvdW5kYXJpZXMgb2YgdGhlIHBvcHBlciBwb3NpdGlvbi5cbiAgICAgKiBUaGUgcG9wcGVyIHdpbGwgbmV2ZXIgYmUgcGxhY2VkIG91dHNpZGUgb2YgdGhlIGRlZmluZWQgYm91bmRhcmllc1xuICAgICAqIChleGNlcHQgaWYgYGtlZXBUb2dldGhlcmAgaXMgZW5hYmxlZClcbiAgICAgKi9cbiAgICBib3VuZGFyaWVzRWxlbWVudDogJ3ZpZXdwb3J0J1xuICB9LFxuXG4gIC8qKlxuICAgKiBNb2RpZmllciB1c2VkIHRvIG1ha2UgdGhlIHBvcHBlciBmbG93IHRvd2FyZCB0aGUgaW5uZXIgb2YgdGhlIHJlZmVyZW5jZSBlbGVtZW50LlxuICAgKiBCeSBkZWZhdWx0LCB3aGVuIHRoaXMgbW9kaWZpZXIgaXMgZGlzYWJsZWQsIHRoZSBwb3BwZXIgd2lsbCBiZSBwbGFjZWQgb3V0c2lkZVxuICAgKiB0aGUgcmVmZXJlbmNlIGVsZW1lbnQuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBpbm5lcjoge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj03MDAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDcwMCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9ZmFsc2UgLSBXaGV0aGVyIHRoZSBtb2RpZmllciBpcyBlbmFibGVkIG9yIG5vdCAqL1xuICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogaW5uZXJcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBoaWRlIHRoZSBwb3BwZXIgd2hlbiBpdHMgcmVmZXJlbmNlIGVsZW1lbnQgaXMgb3V0c2lkZSBvZiB0aGVcbiAgICogcG9wcGVyIGJvdW5kYXJpZXMuIEl0IHdpbGwgc2V0IGEgYHgtb3V0LW9mLWJvdW5kYXJpZXNgIGF0dHJpYnV0ZSB3aGljaCBjYW5cbiAgICogYmUgdXNlZCB0byBoaWRlIHdpdGggYSBDU1Mgc2VsZWN0b3IgdGhlIHBvcHBlciB3aGVuIGl0cyByZWZlcmVuY2UgaXNcbiAgICogb3V0IG9mIGJvdW5kYXJpZXMuXG4gICAqXG4gICAqIFJlcXVpcmVzIHRoZSBgcHJldmVudE92ZXJmbG93YCBtb2RpZmllciBiZWZvcmUgaXQgaW4gb3JkZXIgdG8gd29yay5cbiAgICogQG1lbWJlcm9mIG1vZGlmaWVyc1xuICAgKiBAaW5uZXJcbiAgICovXG4gIGhpZGU6IHtcbiAgICAvKiogQHByb3Age251bWJlcn0gb3JkZXI9ODAwIC0gSW5kZXggdXNlZCB0byBkZWZpbmUgdGhlIG9yZGVyIG9mIGV4ZWN1dGlvbiAqL1xuICAgIG9yZGVyOiA4MDAsXG4gICAgLyoqIEBwcm9wIHtCb29sZWFufSBlbmFibGVkPXRydWUgLSBXaGV0aGVyIHRoZSBtb2RpZmllciBpcyBlbmFibGVkIG9yIG5vdCAqL1xuICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgLyoqIEBwcm9wIHtNb2RpZmllckZufSAqL1xuICAgIGZuOiBoaWRlXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIHRoZSBzdHlsZSB0aGF0IHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyIGVsZW1lbnQgdG8gZ2V0c1xuICAgKiBwcm9wZXJseSBwb3NpdGlvbmVkLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBtb2RpZmllciB3aWxsIG5vdCB0b3VjaCB0aGUgRE9NLCBpdCBqdXN0IHByZXBhcmVzIHRoZSBzdHlsZXNcbiAgICogc28gdGhhdCBgYXBwbHlTdHlsZWAgbW9kaWZpZXIgY2FuIGFwcGx5IGl0LiBUaGlzIHNlcGFyYXRpb24gaXMgdXNlZnVsXG4gICAqIGluIGNhc2UgeW91IG5lZWQgdG8gcmVwbGFjZSBgYXBwbHlTdHlsZWAgd2l0aCBhIGN1c3RvbSBpbXBsZW1lbnRhdGlvbi5cbiAgICpcbiAgICogVGhpcyBtb2RpZmllciBoYXMgYDg1MGAgYXMgYG9yZGVyYCB2YWx1ZSB0byBtYWludGFpbiBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAqIHdpdGggcHJldmlvdXMgdmVyc2lvbnMgb2YgUG9wcGVyLmpzLiBFeHBlY3QgdGhlIG1vZGlmaWVycyBvcmRlcmluZyBtZXRob2RcbiAgICogdG8gY2hhbmdlIGluIGZ1dHVyZSBtYWpvciB2ZXJzaW9ucyBvZiB0aGUgbGlicmFyeS5cbiAgICpcbiAgICogQG1lbWJlcm9mIG1vZGlmaWVyc1xuICAgKiBAaW5uZXJcbiAgICovXG4gIGNvbXB1dGVTdHlsZToge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj04NTAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDg1MCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9dHJ1ZSAtIFdoZXRoZXIgdGhlIG1vZGlmaWVyIGlzIGVuYWJsZWQgb3Igbm90ICovXG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAvKiogQHByb3Age01vZGlmaWVyRm59ICovXG4gICAgZm46IGNvbXB1dGVTdHlsZSxcbiAgICAvKipcbiAgICAgKiBAcHJvcCB7Qm9vbGVhbn0gZ3B1QWNjZWxlcmF0aW9uPXRydWVcbiAgICAgKiBJZiB0cnVlLCBpdCB1c2VzIHRoZSBDU1MgM0QgdHJhbnNmb3JtYXRpb24gdG8gcG9zaXRpb24gdGhlIHBvcHBlci5cbiAgICAgKiBPdGhlcndpc2UsIGl0IHdpbGwgdXNlIHRoZSBgdG9wYCBhbmQgYGxlZnRgIHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICBncHVBY2NlbGVyYXRpb246IHRydWUsXG4gICAgLyoqXG4gICAgICogQHByb3Age3N0cmluZ30gW3g9J2JvdHRvbSddXG4gICAgICogV2hlcmUgdG8gYW5jaG9yIHRoZSBYIGF4aXMgKGBib3R0b21gIG9yIGB0b3BgKS4gQUtBIFggb2Zmc2V0IG9yaWdpbi5cbiAgICAgKiBDaGFuZ2UgdGhpcyBpZiB5b3VyIHBvcHBlciBzaG91bGQgZ3JvdyBpbiBhIGRpcmVjdGlvbiBkaWZmZXJlbnQgZnJvbSBgYm90dG9tYFxuICAgICAqL1xuICAgIHg6ICdib3R0b20nLFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtzdHJpbmd9IFt4PSdsZWZ0J11cbiAgICAgKiBXaGVyZSB0byBhbmNob3IgdGhlIFkgYXhpcyAoYGxlZnRgIG9yIGByaWdodGApLiBBS0EgWSBvZmZzZXQgb3JpZ2luLlxuICAgICAqIENoYW5nZSB0aGlzIGlmIHlvdXIgcG9wcGVyIHNob3VsZCBncm93IGluIGEgZGlyZWN0aW9uIGRpZmZlcmVudCBmcm9tIGByaWdodGBcbiAgICAgKi9cbiAgICB5OiAncmlnaHQnXG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgdGhlIGNvbXB1dGVkIHN0eWxlcyB0byB0aGUgcG9wcGVyIGVsZW1lbnQuXG4gICAqXG4gICAqIEFsbCB0aGUgRE9NIG1hbmlwdWxhdGlvbnMgYXJlIGxpbWl0ZWQgdG8gdGhpcyBtb2RpZmllci4gVGhpcyBpcyB1c2VmdWwgaW4gY2FzZVxuICAgKiB5b3Ugd2FudCB0byBpbnRlZ3JhdGUgUG9wcGVyLmpzIGluc2lkZSBhIGZyYW1ld29yayBvciB2aWV3IGxpYnJhcnkgYW5kIHlvdVxuICAgKiB3YW50IHRvIGRlbGVnYXRlIGFsbCB0aGUgRE9NIG1hbmlwdWxhdGlvbnMgdG8gaXQuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpZiB5b3UgZGlzYWJsZSB0aGlzIG1vZGlmaWVyLCB5b3UgbXVzdCBtYWtlIHN1cmUgdGhlIHBvcHBlciBlbGVtZW50XG4gICAqIGhhcyBpdHMgcG9zaXRpb24gc2V0IHRvIGBhYnNvbHV0ZWAgYmVmb3JlIFBvcHBlci5qcyBjYW4gZG8gaXRzIHdvcmshXG4gICAqXG4gICAqIEp1c3QgZGlzYWJsZSB0aGlzIG1vZGlmaWVyIGFuZCBkZWZpbmUgeW91ciBvd24gdG8gYWNoaWV2ZSB0aGUgZGVzaXJlZCBlZmZlY3QuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBhcHBseVN0eWxlOiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTkwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogOTAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogYXBwbHlTdHlsZSxcbiAgICAvKiogQHByb3Age0Z1bmN0aW9ufSAqL1xuICAgIG9uTG9hZDogYXBwbHlTdHlsZU9uTG9hZCxcbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2ZXJzaW9uIDEuMTAuMCwgdGhlIHByb3BlcnR5IG1vdmVkIHRvIGBjb21wdXRlU3R5bGVgIG1vZGlmaWVyXG4gICAgICogQHByb3Age0Jvb2xlYW59IGdwdUFjY2VsZXJhdGlvbj10cnVlXG4gICAgICogSWYgdHJ1ZSwgaXQgdXNlcyB0aGUgQ1NTIDNEIHRyYW5zZm9ybWF0aW9uIHRvIHBvc2l0aW9uIHRoZSBwb3BwZXIuXG4gICAgICogT3RoZXJ3aXNlLCBpdCB3aWxsIHVzZSB0aGUgYHRvcGAgYW5kIGBsZWZ0YCBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgZ3B1QWNjZWxlcmF0aW9uOiB1bmRlZmluZWRcbiAgfVxufTtcblxuLyoqXG4gKiBUaGUgYGRhdGFPYmplY3RgIGlzIGFuIG9iamVjdCBjb250YWluaW5nIGFsbCB0aGUgaW5mb3JtYXRpb24gdXNlZCBieSBQb3BwZXIuanMuXG4gKiBUaGlzIG9iamVjdCBpcyBwYXNzZWQgdG8gbW9kaWZpZXJzIGFuZCB0byB0aGUgYG9uQ3JlYXRlYCBhbmQgYG9uVXBkYXRlYCBjYWxsYmFja3MuXG4gKiBAbmFtZSBkYXRhT2JqZWN0XG4gKiBAcHJvcGVydHkge09iamVjdH0gZGF0YS5pbnN0YW5jZSBUaGUgUG9wcGVyLmpzIGluc3RhbmNlXG4gKiBAcHJvcGVydHkge1N0cmluZ30gZGF0YS5wbGFjZW1lbnQgUGxhY2VtZW50IGFwcGxpZWQgdG8gcG9wcGVyXG4gKiBAcHJvcGVydHkge1N0cmluZ30gZGF0YS5vcmlnaW5hbFBsYWNlbWVudCBQbGFjZW1lbnQgb3JpZ2luYWxseSBkZWZpbmVkIG9uIGluaXRcbiAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gZGF0YS5mbGlwcGVkIFRydWUgaWYgcG9wcGVyIGhhcyBiZWVuIGZsaXBwZWQgYnkgZmxpcCBtb2RpZmllclxuICogQHByb3BlcnR5IHtCb29sZWFufSBkYXRhLmhpZGUgVHJ1ZSBpZiB0aGUgcmVmZXJlbmNlIGVsZW1lbnQgaXMgb3V0IG9mIGJvdW5kYXJpZXMsIHVzZWZ1bCB0byBrbm93IHdoZW4gdG8gaGlkZSB0aGUgcG9wcGVyXG4gKiBAcHJvcGVydHkge0hUTUxFbGVtZW50fSBkYXRhLmFycm93RWxlbWVudCBOb2RlIHVzZWQgYXMgYXJyb3cgYnkgYXJyb3cgbW9kaWZpZXJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkYXRhLnN0eWxlcyBBbnkgQ1NTIHByb3BlcnR5IGRlZmluZWQgaGVyZSB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlci4gSXQgZXhwZWN0cyB0aGUgSmF2YVNjcmlwdCBub21lbmNsYXR1cmUgKGVnLiBgbWFyZ2luQm90dG9tYClcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkYXRhLmFycm93U3R5bGVzIEFueSBDU1MgcHJvcGVydHkgZGVmaW5lZCBoZXJlIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyIGFycm93LiBJdCBleHBlY3RzIHRoZSBKYXZhU2NyaXB0IG5vbWVuY2xhdHVyZSAoZWcuIGBtYXJnaW5Cb3R0b21gKVxuICogQHByb3BlcnR5IHtPYmplY3R9IGRhdGEuYm91bmRhcmllcyBPZmZzZXRzIG9mIHRoZSBwb3BwZXIgYm91bmRhcmllc1xuICogQHByb3BlcnR5IHtPYmplY3R9IGRhdGEub2Zmc2V0cyBUaGUgbWVhc3VyZW1lbnRzIG9mIHBvcHBlciwgcmVmZXJlbmNlIGFuZCBhcnJvdyBlbGVtZW50c1xuICogQHByb3BlcnR5IHtPYmplY3R9IGRhdGEub2Zmc2V0cy5wb3BwZXIgYHRvcGAsIGBsZWZ0YCwgYHdpZHRoYCwgYGhlaWdodGAgdmFsdWVzXG4gKiBAcHJvcGVydHkge09iamVjdH0gZGF0YS5vZmZzZXRzLnJlZmVyZW5jZSBgdG9wYCwgYGxlZnRgLCBgd2lkdGhgLCBgaGVpZ2h0YCB2YWx1ZXNcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkYXRhLm9mZnNldHMuYXJyb3ddIGB0b3BgIGFuZCBgbGVmdGAgb2Zmc2V0cywgb25seSBvbmUgb2YgdGhlbSB3aWxsIGJlIGRpZmZlcmVudCBmcm9tIDBcbiAqL1xuXG4vKipcbiAqIERlZmF1bHQgb3B0aW9ucyBwcm92aWRlZCB0byBQb3BwZXIuanMgY29uc3RydWN0b3IuPGJyIC8+XG4gKiBUaGVzZSBjYW4gYmUgb3ZlcnJpZGRlbiB1c2luZyB0aGUgYG9wdGlvbnNgIGFyZ3VtZW50IG9mIFBvcHBlci5qcy48YnIgLz5cbiAqIFRvIG92ZXJyaWRlIGFuIG9wdGlvbiwgc2ltcGx5IHBhc3MgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWVcbiAqIHN0cnVjdHVyZSBvZiB0aGUgYG9wdGlvbnNgIG9iamVjdCwgYXMgdGhlIDNyZCBhcmd1bWVudC4gRm9yIGV4YW1wbGU6XG4gKiBgYGBcbiAqIG5ldyBQb3BwZXIocmVmLCBwb3AsIHtcbiAqICAgbW9kaWZpZXJzOiB7XG4gKiAgICAgcHJldmVudE92ZXJmbG93OiB7IGVuYWJsZWQ6IGZhbHNlIH1cbiAqICAgfVxuICogfSlcbiAqIGBgYFxuICogQHR5cGUge09iamVjdH1cbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJvZiBQb3BwZXJcbiAqL1xudmFyIERlZmF1bHRzID0ge1xuICAvKipcbiAgICogUG9wcGVyJ3MgcGxhY2VtZW50LlxuICAgKiBAcHJvcCB7UG9wcGVyLnBsYWNlbWVudHN9IHBsYWNlbWVudD0nYm90dG9tJ1xuICAgKi9cbiAgcGxhY2VtZW50OiAnYm90dG9tJyxcblxuICAvKipcbiAgICogU2V0IHRoaXMgdG8gdHJ1ZSBpZiB5b3Ugd2FudCBwb3BwZXIgdG8gcG9zaXRpb24gaXQgc2VsZiBpbiAnZml4ZWQnIG1vZGVcbiAgICogQHByb3Age0Jvb2xlYW59IHBvc2l0aW9uRml4ZWQ9ZmFsc2VcbiAgICovXG4gIHBvc2l0aW9uRml4ZWQ6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGV2ZW50cyAocmVzaXplLCBzY3JvbGwpIGFyZSBpbml0aWFsbHkgZW5hYmxlZC5cbiAgICogQHByb3Age0Jvb2xlYW59IGV2ZW50c0VuYWJsZWQ9dHJ1ZVxuICAgKi9cbiAgZXZlbnRzRW5hYmxlZDogdHJ1ZSxcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgaWYgeW91IHdhbnQgdG8gYXV0b21hdGljYWxseSByZW1vdmUgdGhlIHBvcHBlciB3aGVuXG4gICAqIHlvdSBjYWxsIHRoZSBgZGVzdHJveWAgbWV0aG9kLlxuICAgKiBAcHJvcCB7Qm9vbGVhbn0gcmVtb3ZlT25EZXN0cm95PWZhbHNlXG4gICAqL1xuICByZW1vdmVPbkRlc3Ryb3k6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBjYWxsZWQgd2hlbiB0aGUgcG9wcGVyIGlzIGNyZWF0ZWQuPGJyIC8+XG4gICAqIEJ5IGRlZmF1bHQsIGl0IGlzIHNldCB0byBuby1vcC48YnIgLz5cbiAgICogQWNjZXNzIFBvcHBlci5qcyBpbnN0YW5jZSB3aXRoIGBkYXRhLmluc3RhbmNlYC5cbiAgICogQHByb3Age29uQ3JlYXRlfVxuICAgKi9cbiAgb25DcmVhdGU6IGZ1bmN0aW9uIG9uQ3JlYXRlKCkge30sXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGNhbGxlZCB3aGVuIHRoZSBwb3BwZXIgaXMgdXBkYXRlZC4gVGhpcyBjYWxsYmFjayBpcyBub3QgY2FsbGVkXG4gICAqIG9uIHRoZSBpbml0aWFsaXphdGlvbi9jcmVhdGlvbiBvZiB0aGUgcG9wcGVyLCBidXQgb25seSBvbiBzdWJzZXF1ZW50XG4gICAqIHVwZGF0ZXMuPGJyIC8+XG4gICAqIEJ5IGRlZmF1bHQsIGl0IGlzIHNldCB0byBuby1vcC48YnIgLz5cbiAgICogQWNjZXNzIFBvcHBlci5qcyBpbnN0YW5jZSB3aXRoIGBkYXRhLmluc3RhbmNlYC5cbiAgICogQHByb3Age29uVXBkYXRlfVxuICAgKi9cbiAgb25VcGRhdGU6IGZ1bmN0aW9uIG9uVXBkYXRlKCkge30sXG5cbiAgLyoqXG4gICAqIExpc3Qgb2YgbW9kaWZpZXJzIHVzZWQgdG8gbW9kaWZ5IHRoZSBvZmZzZXRzIGJlZm9yZSB0aGV5IGFyZSBhcHBsaWVkIHRvIHRoZSBwb3BwZXIuXG4gICAqIFRoZXkgcHJvdmlkZSBtb3N0IG9mIHRoZSBmdW5jdGlvbmFsaXRpZXMgb2YgUG9wcGVyLmpzLlxuICAgKiBAcHJvcCB7bW9kaWZpZXJzfVxuICAgKi9cbiAgbW9kaWZpZXJzOiBtb2RpZmllcnNcbn07XG5cbi8qKlxuICogQGNhbGxiYWNrIG9uQ3JlYXRlXG4gKiBAcGFyYW0ge2RhdGFPYmplY3R9IGRhdGFcbiAqL1xuXG4vKipcbiAqIEBjYWxsYmFjayBvblVwZGF0ZVxuICogQHBhcmFtIHtkYXRhT2JqZWN0fSBkYXRhXG4gKi9cblxuLy8gVXRpbHNcbi8vIE1ldGhvZHNcbnZhciBQb3BwZXIgPSBmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IFBvcHBlci5qcyBpbnN0YW5jZS5cbiAgICogQGNsYXNzIFBvcHBlclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fHJlZmVyZW5jZU9iamVjdH0gcmVmZXJlbmNlIC0gVGhlIHJlZmVyZW5jZSBlbGVtZW50IHVzZWQgdG8gcG9zaXRpb24gdGhlIHBvcHBlclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBwb3BwZXIgLSBUaGUgSFRNTCBlbGVtZW50IHVzZWQgYXMgdGhlIHBvcHBlclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIFlvdXIgY3VzdG9tIG9wdGlvbnMgdG8gb3ZlcnJpZGUgdGhlIG9uZXMgZGVmaW5lZCBpbiBbRGVmYXVsdHNdKCNkZWZhdWx0cylcbiAgICogQHJldHVybiB7T2JqZWN0fSBpbnN0YW5jZSAtIFRoZSBnZW5lcmF0ZWQgUG9wcGVyLmpzIGluc3RhbmNlXG4gICAqL1xuICBmdW5jdGlvbiBQb3BwZXIocmVmZXJlbmNlLCBwb3BwZXIpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IHt9O1xuICAgIGNsYXNzQ2FsbENoZWNrKHRoaXMsIFBvcHBlcik7XG5cbiAgICB0aGlzLnNjaGVkdWxlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlcXVlc3RBbmltYXRpb25GcmFtZShfdGhpcy51cGRhdGUpO1xuICAgIH07XG5cbiAgICAvLyBtYWtlIHVwZGF0ZSgpIGRlYm91bmNlZCwgc28gdGhhdCBpdCBvbmx5IHJ1bnMgYXQgbW9zdCBvbmNlLXBlci10aWNrXG4gICAgdGhpcy51cGRhdGUgPSBkZWJvdW5jZSh0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcblxuICAgIC8vIHdpdGgge30gd2UgY3JlYXRlIGEgbmV3IG9iamVjdCB3aXRoIHRoZSBvcHRpb25zIGluc2lkZSBpdFxuICAgIHRoaXMub3B0aW9ucyA9IF9leHRlbmRzKHt9LCBQb3BwZXIuRGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgLy8gaW5pdCBzdGF0ZVxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBpc0Rlc3Ryb3llZDogZmFsc2UsXG4gICAgICBpc0NyZWF0ZWQ6IGZhbHNlLFxuICAgICAgc2Nyb2xsUGFyZW50czogW11cbiAgICB9O1xuXG4gICAgLy8gZ2V0IHJlZmVyZW5jZSBhbmQgcG9wcGVyIGVsZW1lbnRzIChhbGxvdyBqUXVlcnkgd3JhcHBlcnMpXG4gICAgdGhpcy5yZWZlcmVuY2UgPSByZWZlcmVuY2UgJiYgcmVmZXJlbmNlLmpxdWVyeSA/IHJlZmVyZW5jZVswXSA6IHJlZmVyZW5jZTtcbiAgICB0aGlzLnBvcHBlciA9IHBvcHBlciAmJiBwb3BwZXIuanF1ZXJ5ID8gcG9wcGVyWzBdIDogcG9wcGVyO1xuXG4gICAgLy8gRGVlcCBtZXJnZSBtb2RpZmllcnMgb3B0aW9uc1xuICAgIHRoaXMub3B0aW9ucy5tb2RpZmllcnMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhfZXh0ZW5kcyh7fSwgUG9wcGVyLkRlZmF1bHRzLm1vZGlmaWVycywgb3B0aW9ucy5tb2RpZmllcnMpKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICBfdGhpcy5vcHRpb25zLm1vZGlmaWVyc1tuYW1lXSA9IF9leHRlbmRzKHt9LCBQb3BwZXIuRGVmYXVsdHMubW9kaWZpZXJzW25hbWVdIHx8IHt9LCBvcHRpb25zLm1vZGlmaWVycyA/IG9wdGlvbnMubW9kaWZpZXJzW25hbWVdIDoge30pO1xuICAgIH0pO1xuXG4gICAgLy8gUmVmYWN0b3JpbmcgbW9kaWZpZXJzJyBsaXN0IChPYmplY3QgPT4gQXJyYXkpXG4gICAgdGhpcy5tb2RpZmllcnMgPSBPYmplY3Qua2V5cyh0aGlzLm9wdGlvbnMubW9kaWZpZXJzKS5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIHJldHVybiBfZXh0ZW5kcyh7XG4gICAgICAgIG5hbWU6IG5hbWVcbiAgICAgIH0sIF90aGlzLm9wdGlvbnMubW9kaWZpZXJzW25hbWVdKTtcbiAgICB9KVxuICAgIC8vIHNvcnQgdGhlIG1vZGlmaWVycyBieSBvcmRlclxuICAgIC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYS5vcmRlciAtIGIub3JkZXI7XG4gICAgfSk7XG5cbiAgICAvLyBtb2RpZmllcnMgaGF2ZSB0aGUgYWJpbGl0eSB0byBleGVjdXRlIGFyYml0cmFyeSBjb2RlIHdoZW4gUG9wcGVyLmpzIGdldCBpbml0ZWRcbiAgICAvLyBzdWNoIGNvZGUgaXMgZXhlY3V0ZWQgaW4gdGhlIHNhbWUgb3JkZXIgb2YgaXRzIG1vZGlmaWVyXG4gICAgLy8gdGhleSBjb3VsZCBhZGQgbmV3IHByb3BlcnRpZXMgdG8gdGhlaXIgb3B0aW9ucyBjb25maWd1cmF0aW9uXG4gICAgLy8gQkUgQVdBUkU6IGRvbid0IGFkZCBvcHRpb25zIHRvIGBvcHRpb25zLm1vZGlmaWVycy5uYW1lYCBidXQgdG8gYG1vZGlmaWVyT3B0aW9uc2AhXG4gICAgdGhpcy5tb2RpZmllcnMuZm9yRWFjaChmdW5jdGlvbiAobW9kaWZpZXJPcHRpb25zKSB7XG4gICAgICBpZiAobW9kaWZpZXJPcHRpb25zLmVuYWJsZWQgJiYgaXNGdW5jdGlvbihtb2RpZmllck9wdGlvbnMub25Mb2FkKSkge1xuICAgICAgICBtb2RpZmllck9wdGlvbnMub25Mb2FkKF90aGlzLnJlZmVyZW5jZSwgX3RoaXMucG9wcGVyLCBfdGhpcy5vcHRpb25zLCBtb2RpZmllck9wdGlvbnMsIF90aGlzLnN0YXRlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGZpcmUgdGhlIGZpcnN0IHVwZGF0ZSB0byBwb3NpdGlvbiB0aGUgcG9wcGVyIGluIHRoZSByaWdodCBwbGFjZVxuICAgIHRoaXMudXBkYXRlKCk7XG5cbiAgICB2YXIgZXZlbnRzRW5hYmxlZCA9IHRoaXMub3B0aW9ucy5ldmVudHNFbmFibGVkO1xuICAgIGlmIChldmVudHNFbmFibGVkKSB7XG4gICAgICAvLyBzZXR1cCBldmVudCBsaXN0ZW5lcnMsIHRoZXkgd2lsbCB0YWtlIGNhcmUgb2YgdXBkYXRlIHRoZSBwb3NpdGlvbiBpbiBzcGVjaWZpYyBzaXR1YXRpb25zXG4gICAgICB0aGlzLmVuYWJsZUV2ZW50TGlzdGVuZXJzKCk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5ldmVudHNFbmFibGVkID0gZXZlbnRzRW5hYmxlZDtcbiAgfVxuXG4gIC8vIFdlIGNhbid0IHVzZSBjbGFzcyBwcm9wZXJ0aWVzIGJlY2F1c2UgdGhleSBkb24ndCBnZXQgbGlzdGVkIGluIHRoZVxuICAvLyBjbGFzcyBwcm90b3R5cGUgYW5kIGJyZWFrIHN0dWZmIGxpa2UgU2lub24gc3R1YnNcblxuXG4gIGNyZWF0ZUNsYXNzKFBvcHBlciwgW3tcbiAgICBrZXk6ICd1cGRhdGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGUkJDEoKSB7XG4gICAgICByZXR1cm4gdXBkYXRlLmNhbGwodGhpcyk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZGVzdHJveScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGRlc3Ryb3kkJDEoKSB7XG4gICAgICByZXR1cm4gZGVzdHJveS5jYWxsKHRoaXMpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2VuYWJsZUV2ZW50TGlzdGVuZXJzJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZW5hYmxlRXZlbnRMaXN0ZW5lcnMkJDEoKSB7XG4gICAgICByZXR1cm4gZW5hYmxlRXZlbnRMaXN0ZW5lcnMuY2FsbCh0aGlzKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdkaXNhYmxlRXZlbnRMaXN0ZW5lcnMnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBkaXNhYmxlRXZlbnRMaXN0ZW5lcnMkJDEoKSB7XG4gICAgICByZXR1cm4gZGlzYWJsZUV2ZW50TGlzdGVuZXJzLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2NoZWR1bGVzIGFuIHVwZGF0ZS4gSXQgd2lsbCBydW4gb24gdGhlIG5leHQgVUkgdXBkYXRlIGF2YWlsYWJsZS5cbiAgICAgKiBAbWV0aG9kIHNjaGVkdWxlVXBkYXRlXG4gICAgICogQG1lbWJlcm9mIFBvcHBlclxuICAgICAqL1xuXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0aW9uIG9mIHV0aWxpdGllcyB1c2VmdWwgd2hlbiB3cml0aW5nIGN1c3RvbSBtb2RpZmllcnMuXG4gICAgICogU3RhcnRpbmcgZnJvbSB2ZXJzaW9uIDEuNywgdGhpcyBtZXRob2QgaXMgYXZhaWxhYmxlIG9ubHkgaWYgeW91XG4gICAgICogaW5jbHVkZSBgcG9wcGVyLXV0aWxzLmpzYCBiZWZvcmUgYHBvcHBlci5qc2AuXG4gICAgICpcbiAgICAgKiAqKkRFUFJFQ0FUSU9OKio6IFRoaXMgd2F5IHRvIGFjY2VzcyBQb3BwZXJVdGlscyBpcyBkZXByZWNhdGVkXG4gICAgICogYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiB2MiEgVXNlIHRoZSBQb3BwZXJVdGlscyBtb2R1bGUgZGlyZWN0bHkgaW5zdGVhZC5cbiAgICAgKiBEdWUgdG8gdGhlIGhpZ2ggaW5zdGFiaWxpdHkgb2YgdGhlIG1ldGhvZHMgY29udGFpbmVkIGluIFV0aWxzLCB3ZSBjYW4ndFxuICAgICAqIGd1YXJhbnRlZSB0aGVtIHRvIGZvbGxvdyBzZW12ZXIuIFVzZSB0aGVtIGF0IHlvdXIgb3duIHJpc2shXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2ZXJzaW9uIDEuOFxuICAgICAqIEBtZW1iZXIgVXRpbHNcbiAgICAgKiBAbWVtYmVyb2YgUG9wcGVyXG4gICAgICovXG5cbiAgfV0pO1xuICByZXR1cm4gUG9wcGVyO1xufSgpO1xuXG4vKipcbiAqIFRoZSBgcmVmZXJlbmNlT2JqZWN0YCBpcyBhbiBvYmplY3QgdGhhdCBwcm92aWRlcyBhbiBpbnRlcmZhY2UgY29tcGF0aWJsZSB3aXRoIFBvcHBlci5qc1xuICogYW5kIGxldHMgeW91IHVzZSBpdCBhcyByZXBsYWNlbWVudCBvZiBhIHJlYWwgRE9NIG5vZGUuPGJyIC8+XG4gKiBZb3UgY2FuIHVzZSB0aGlzIG1ldGhvZCB0byBwb3NpdGlvbiBhIHBvcHBlciByZWxhdGl2ZWx5IHRvIGEgc2V0IG9mIGNvb3JkaW5hdGVzXG4gKiBpbiBjYXNlIHlvdSBkb24ndCBoYXZlIGEgRE9NIG5vZGUgdG8gdXNlIGFzIHJlZmVyZW5jZS5cbiAqXG4gKiBgYGBcbiAqIG5ldyBQb3BwZXIocmVmZXJlbmNlT2JqZWN0LCBwb3BwZXJOb2RlKTtcbiAqIGBgYFxuICpcbiAqIE5COiBUaGlzIGZlYXR1cmUgaXNuJ3Qgc3VwcG9ydGVkIGluIEludGVybmV0IEV4cGxvcmVyIDEwLlxuICogQG5hbWUgcmVmZXJlbmNlT2JqZWN0XG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBkYXRhLmdldEJvdW5kaW5nQ2xpZW50UmVjdFxuICogQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBzZXQgb2YgY29vcmRpbmF0ZXMgY29tcGF0aWJsZSB3aXRoIHRoZSBuYXRpdmUgYGdldEJvdW5kaW5nQ2xpZW50UmVjdGAgbWV0aG9kLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGRhdGEuY2xpZW50V2lkdGhcbiAqIEFuIEVTNiBnZXR0ZXIgdGhhdCB3aWxsIHJldHVybiB0aGUgd2lkdGggb2YgdGhlIHZpcnR1YWwgcmVmZXJlbmNlIGVsZW1lbnQuXG4gKiBAcHJvcGVydHkge251bWJlcn0gZGF0YS5jbGllbnRIZWlnaHRcbiAqIEFuIEVTNiBnZXR0ZXIgdGhhdCB3aWxsIHJldHVybiB0aGUgaGVpZ2h0IG9mIHRoZSB2aXJ0dWFsIHJlZmVyZW5jZSBlbGVtZW50LlxuICovXG5cblxuUG9wcGVyLlV0aWxzID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogZ2xvYmFsKS5Qb3BwZXJVdGlscztcblBvcHBlci5wbGFjZW1lbnRzID0gcGxhY2VtZW50cztcblBvcHBlci5EZWZhdWx0cyA9IERlZmF1bHRzO1xuXG5yZXR1cm4gUG9wcGVyO1xuXG59KSkpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cG9wcGVyLmpzLm1hcFxuXG4vKiFcbiAgKiBCb290c3RyYXAgdjQuMS4zIChodHRwczovL2dldGJvb3RzdHJhcC5jb20vKVxuICAqIENvcHlyaWdodCAyMDExLTIwMTggVGhlIEJvb3RzdHJhcCBBdXRob3JzIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvZ3JhcGhzL2NvbnRyaWJ1dG9ycylcbiAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzLCByZXF1aXJlKCdqcXVlcnknKSwgcmVxdWlyZSgncG9wcGVyLmpzJykpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cycsICdqcXVlcnknLCAncG9wcGVyLmpzJ10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5ib290c3RyYXAgPSB7fSksZ2xvYmFsLmpRdWVyeSxnbG9iYWwuUG9wcGVyKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cywkLFBvcHBlcikgeyAndXNlIHN0cmljdCc7XG5cbiAgJCA9ICQgJiYgJC5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdCcpID8gJFsnZGVmYXVsdCddIDogJDtcbiAgUG9wcGVyID0gUG9wcGVyICYmIFBvcHBlci5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdCcpID8gUG9wcGVyWydkZWZhdWx0J10gOiBQb3BwZXI7XG5cbiAgZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07XG4gICAgICBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7XG4gICAgICBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7XG4gICAgICBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIF9jcmVhdGVDbGFzcyhDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7XG4gICAgcmV0dXJuIENvbnN0cnVjdG9yO1xuICB9XG5cbiAgZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KG9iaiwga2V5LCB2YWx1ZSkge1xuICAgIGlmIChrZXkgaW4gb2JqKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tleV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gX29iamVjdFNwcmVhZCh0YXJnZXQpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXSAhPSBudWxsID8gYXJndW1lbnRzW2ldIDoge307XG4gICAgICB2YXIgb3duS2V5cyA9IE9iamVjdC5rZXlzKHNvdXJjZSk7XG5cbiAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvd25LZXlzID0gb3duS2V5cy5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzb3VyY2UpLmZpbHRlcihmdW5jdGlvbiAoc3ltKSB7XG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBzeW0pLmVudW1lcmFibGU7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgb3duS2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgX2RlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCBzb3VyY2Vba2V5XSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgZnVuY3Rpb24gX2luaGVyaXRzTG9vc2Uoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHtcbiAgICBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MucHJvdG90eXBlKTtcbiAgICBzdWJDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJDbGFzcztcbiAgICBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzO1xuICB9XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIEJvb3RzdHJhcCAodjQuMS4zKTogdXRpbC5qc1xuICAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgVXRpbCA9IGZ1bmN0aW9uICgkJCQxKSB7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogUHJpdmF0ZSBUcmFuc2l0aW9uRW5kIEhlbHBlcnNcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cbiAgICB2YXIgVFJBTlNJVElPTl9FTkQgPSAndHJhbnNpdGlvbmVuZCc7XG4gICAgdmFyIE1BWF9VSUQgPSAxMDAwMDAwO1xuICAgIHZhciBNSUxMSVNFQ09ORFNfTVVMVElQTElFUiA9IDEwMDA7IC8vIFNob3V0b3V0IEFuZ3VzQ3JvbGwgKGh0dHBzOi8vZ29vLmdsL3B4d1FHcClcblxuICAgIGZ1bmN0aW9uIHRvVHlwZShvYmopIHtcbiAgICAgIHJldHVybiB7fS50b1N0cmluZy5jYWxsKG9iaikubWF0Y2goL1xccyhbYS16XSspL2kpWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U3BlY2lhbFRyYW5zaXRpb25FbmRFdmVudCgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGJpbmRUeXBlOiBUUkFOU0lUSU9OX0VORCxcbiAgICAgICAgZGVsZWdhdGVUeXBlOiBUUkFOU0lUSU9OX0VORCxcbiAgICAgICAgaGFuZGxlOiBmdW5jdGlvbiBoYW5kbGUoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoJCQkMShldmVudC50YXJnZXQpLmlzKHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZXZlbnQuaGFuZGxlT2JqLmhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBwcmVmZXItcmVzdC1wYXJhbXNcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmaW5lZFxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zaXRpb25FbmRFbXVsYXRvcihkdXJhdGlvbikge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICAgICAgJCQkMSh0aGlzKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgZnVuY3Rpb24gKCkge1xuICAgICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgfSk7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFjYWxsZWQpIHtcbiAgICAgICAgICBVdGlsLnRyaWdnZXJUcmFuc2l0aW9uRW5kKF90aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSwgZHVyYXRpb24pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0VHJhbnNpdGlvbkVuZFN1cHBvcnQoKSB7XG4gICAgICAkJCQxLmZuLmVtdWxhdGVUcmFuc2l0aW9uRW5kID0gdHJhbnNpdGlvbkVuZEVtdWxhdG9yO1xuICAgICAgJCQkMS5ldmVudC5zcGVjaWFsW1V0aWwuVFJBTlNJVElPTl9FTkRdID0gZ2V0U3BlY2lhbFRyYW5zaXRpb25FbmRFdmVudCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIFB1YmxpYyBVdGlsIEFwaVxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cblxuICAgIHZhciBVdGlsID0ge1xuICAgICAgVFJBTlNJVElPTl9FTkQ6ICdic1RyYW5zaXRpb25FbmQnLFxuICAgICAgZ2V0VUlEOiBmdW5jdGlvbiBnZXRVSUQocHJlZml4KSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tYml0d2lzZVxuICAgICAgICAgIHByZWZpeCArPSB+fihNYXRoLnJhbmRvbSgpICogTUFYX1VJRCk7IC8vIFwifn5cIiBhY3RzIGxpa2UgYSBmYXN0ZXIgTWF0aC5mbG9vcigpIGhlcmVcbiAgICAgICAgfSB3aGlsZSAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocHJlZml4KSk7XG5cbiAgICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICAgIH0sXG4gICAgICBnZXRTZWxlY3RvckZyb21FbGVtZW50OiBmdW5jdGlvbiBnZXRTZWxlY3RvckZyb21FbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0Jyk7XG5cbiAgICAgICAgaWYgKCFzZWxlY3RvciB8fCBzZWxlY3RvciA9PT0gJyMnKSB7XG4gICAgICAgICAgc2VsZWN0b3IgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpIHx8ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcikgPyBzZWxlY3RvciA6IG51bGw7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQ6IGZ1bmN0aW9uIGdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gLy8gR2V0IHRyYW5zaXRpb24tZHVyYXRpb24gb2YgdGhlIGVsZW1lbnRcblxuXG4gICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSAkJCQxKGVsZW1lbnQpLmNzcygndHJhbnNpdGlvbi1kdXJhdGlvbicpO1xuICAgICAgICB2YXIgZmxvYXRUcmFuc2l0aW9uRHVyYXRpb24gPSBwYXJzZUZsb2F0KHRyYW5zaXRpb25EdXJhdGlvbik7IC8vIFJldHVybiAwIGlmIGVsZW1lbnQgb3IgdHJhbnNpdGlvbiBkdXJhdGlvbiBpcyBub3QgZm91bmRcblxuICAgICAgICBpZiAoIWZsb2F0VHJhbnNpdGlvbkR1cmF0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gLy8gSWYgbXVsdGlwbGUgZHVyYXRpb25zIGFyZSBkZWZpbmVkLCB0YWtlIHRoZSBmaXJzdFxuXG5cbiAgICAgICAgdHJhbnNpdGlvbkR1cmF0aW9uID0gdHJhbnNpdGlvbkR1cmF0aW9uLnNwbGl0KCcsJylbMF07XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KHRyYW5zaXRpb25EdXJhdGlvbikgKiBNSUxMSVNFQ09ORFNfTVVMVElQTElFUjtcbiAgICAgIH0sXG4gICAgICByZWZsb3c6IGZ1bmN0aW9uIHJlZmxvdyhlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBlbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgICAgIH0sXG4gICAgICB0cmlnZ2VyVHJhbnNpdGlvbkVuZDogZnVuY3Rpb24gdHJpZ2dlclRyYW5zaXRpb25FbmQoZWxlbWVudCkge1xuICAgICAgICAkJCQxKGVsZW1lbnQpLnRyaWdnZXIoVFJBTlNJVElPTl9FTkQpO1xuICAgICAgfSxcbiAgICAgIC8vIFRPRE86IFJlbW92ZSBpbiB2NVxuICAgICAgc3VwcG9ydHNUcmFuc2l0aW9uRW5kOiBmdW5jdGlvbiBzdXBwb3J0c1RyYW5zaXRpb25FbmQoKSB7XG4gICAgICAgIHJldHVybiBCb29sZWFuKFRSQU5TSVRJT05fRU5EKTtcbiAgICAgIH0sXG4gICAgICBpc0VsZW1lbnQ6IGZ1bmN0aW9uIGlzRWxlbWVudChvYmopIHtcbiAgICAgICAgcmV0dXJuIChvYmpbMF0gfHwgb2JqKS5ub2RlVHlwZTtcbiAgICAgIH0sXG4gICAgICB0eXBlQ2hlY2tDb25maWc6IGZ1bmN0aW9uIHR5cGVDaGVja0NvbmZpZyhjb21wb25lbnROYW1lLCBjb25maWcsIGNvbmZpZ1R5cGVzKSB7XG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIGNvbmZpZ1R5cGVzKSB7XG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb25maWdUeXBlcywgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICB2YXIgZXhwZWN0ZWRUeXBlcyA9IGNvbmZpZ1R5cGVzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGNvbmZpZ1twcm9wZXJ0eV07XG4gICAgICAgICAgICB2YXIgdmFsdWVUeXBlID0gdmFsdWUgJiYgVXRpbC5pc0VsZW1lbnQodmFsdWUpID8gJ2VsZW1lbnQnIDogdG9UeXBlKHZhbHVlKTtcblxuICAgICAgICAgICAgaWYgKCFuZXcgUmVnRXhwKGV4cGVjdGVkVHlwZXMpLnRlc3QodmFsdWVUeXBlKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoY29tcG9uZW50TmFtZS50b1VwcGVyQ2FzZSgpICsgXCI6IFwiICsgKFwiT3B0aW9uIFxcXCJcIiArIHByb3BlcnR5ICsgXCJcXFwiIHByb3ZpZGVkIHR5cGUgXFxcIlwiICsgdmFsdWVUeXBlICsgXCJcXFwiIFwiKSArIChcImJ1dCBleHBlY3RlZCB0eXBlIFxcXCJcIiArIGV4cGVjdGVkVHlwZXMgKyBcIlxcXCIuXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHNldFRyYW5zaXRpb25FbmRTdXBwb3J0KCk7XG4gICAgcmV0dXJuIFV0aWw7XG4gIH0oJCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIEJvb3RzdHJhcCAodjQuMS4zKTogYWxlcnQuanNcbiAgICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvYmxvYi9tYXN0ZXIvTElDRU5TRSlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIEFsZXJ0ID0gZnVuY3Rpb24gKCQkJDEpIHtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDb25zdGFudHNcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cbiAgICB2YXIgTkFNRSA9ICdhbGVydCc7XG4gICAgdmFyIFZFUlNJT04gPSAnNC4xLjMnO1xuICAgIHZhciBEQVRBX0tFWSA9ICdicy5hbGVydCc7XG4gICAgdmFyIEVWRU5UX0tFWSA9IFwiLlwiICsgREFUQV9LRVk7XG4gICAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICAgIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkJCQxLmZuW05BTUVdO1xuICAgIHZhciBTZWxlY3RvciA9IHtcbiAgICAgIERJU01JU1M6ICdbZGF0YS1kaXNtaXNzPVwiYWxlcnRcIl0nXG4gICAgfTtcbiAgICB2YXIgRXZlbnQgPSB7XG4gICAgICBDTE9TRTogXCJjbG9zZVwiICsgRVZFTlRfS0VZLFxuICAgICAgQ0xPU0VEOiBcImNsb3NlZFwiICsgRVZFTlRfS0VZLFxuICAgICAgQ0xJQ0tfREFUQV9BUEk6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWVxuICAgIH07XG4gICAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICAgIEFMRVJUOiAnYWxlcnQnLFxuICAgICAgRkFERTogJ2ZhZGUnLFxuICAgICAgU0hPVzogJ3Nob3cnXG4gICAgICAvKipcbiAgICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgKi9cblxuICAgIH07XG5cbiAgICB2YXIgQWxlcnQgPVxuICAgIC8qI19fUFVSRV9fKi9cbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBmdW5jdGlvbiBBbGVydChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgfSAvLyBHZXR0ZXJzXG5cblxuICAgICAgdmFyIF9wcm90byA9IEFsZXJ0LnByb3RvdHlwZTtcblxuICAgICAgLy8gUHVibGljXG4gICAgICBfcHJvdG8uY2xvc2UgPSBmdW5jdGlvbiBjbG9zZShlbGVtZW50KSB7XG4gICAgICAgIHZhciByb290RWxlbWVudCA9IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICByb290RWxlbWVudCA9IHRoaXMuX2dldFJvb3RFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGN1c3RvbUV2ZW50ID0gdGhpcy5fdHJpZ2dlckNsb3NlRXZlbnQocm9vdEVsZW1lbnQpO1xuXG4gICAgICAgIGlmIChjdXN0b21FdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3JlbW92ZUVsZW1lbnQocm9vdEVsZW1lbnQpO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgICAkJCQxLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgICBfcHJvdG8uX2dldFJvb3RFbGVtZW50ID0gZnVuY3Rpb24gX2dldFJvb3RFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gVXRpbC5nZXRTZWxlY3RvckZyb21FbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICB2YXIgcGFyZW50ID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgcGFyZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICAgIHBhcmVudCA9ICQkJDEoZWxlbWVudCkuY2xvc2VzdChcIi5cIiArIENsYXNzTmFtZS5BTEVSVClbMF07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl90cmlnZ2VyQ2xvc2VFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyQ2xvc2VFdmVudChlbGVtZW50KSB7XG4gICAgICAgIHZhciBjbG9zZUV2ZW50ID0gJCQkMS5FdmVudChFdmVudC5DTE9TRSk7XG4gICAgICAgICQkJDEoZWxlbWVudCkudHJpZ2dlcihjbG9zZUV2ZW50KTtcbiAgICAgICAgcmV0dXJuIGNsb3NlRXZlbnQ7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX3JlbW92ZUVsZW1lbnQgPSBmdW5jdGlvbiBfcmVtb3ZlRWxlbWVudChlbGVtZW50KSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgJCQkMShlbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgICAgaWYgKCEkJCQxKGVsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5GQURFKSkge1xuICAgICAgICAgIHRoaXMuX2Rlc3Ryb3lFbGVtZW50KGVsZW1lbnQpO1xuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgICQkJDEoZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpcy5fZGVzdHJveUVsZW1lbnQoZWxlbWVudCwgZXZlbnQpO1xuICAgICAgICB9KS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9kZXN0cm95RWxlbWVudCA9IGZ1bmN0aW9uIF9kZXN0cm95RWxlbWVudChlbGVtZW50KSB7XG4gICAgICAgICQkJDEoZWxlbWVudCkuZGV0YWNoKCkudHJpZ2dlcihFdmVudC5DTE9TRUQpLnJlbW92ZSgpO1xuICAgICAgfTsgLy8gU3RhdGljXG5cblxuICAgICAgQWxlcnQuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciAkZWxlbWVudCA9ICQkJDEodGhpcyk7XG4gICAgICAgICAgdmFyIGRhdGEgPSAkZWxlbWVudC5kYXRhKERBVEFfS0VZKTtcblxuICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgZGF0YSA9IG5ldyBBbGVydCh0aGlzKTtcbiAgICAgICAgICAgICRlbGVtZW50LmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChjb25maWcgPT09ICdjbG9zZScpIHtcbiAgICAgICAgICAgIGRhdGFbY29uZmlnXSh0aGlzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgQWxlcnQuX2hhbmRsZURpc21pc3MgPSBmdW5jdGlvbiBfaGFuZGxlRGlzbWlzcyhhbGVydEluc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWxlcnRJbnN0YW5jZS5jbG9zZSh0aGlzKTtcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIF9jcmVhdGVDbGFzcyhBbGVydCwgbnVsbCwgW3tcbiAgICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICAgIH1cbiAgICAgIH1dKTtcblxuICAgICAgcmV0dXJuIEFsZXJ0O1xuICAgIH0oKTtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG5cbiAgICAkJCQxKGRvY3VtZW50KS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuRElTTUlTUywgQWxlcnQuX2hhbmRsZURpc21pc3MobmV3IEFsZXJ0KCkpKTtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBqUXVlcnlcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICAgICQkJDEuZm5bTkFNRV0gPSBBbGVydC5falF1ZXJ5SW50ZXJmYWNlO1xuICAgICQkJDEuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBBbGVydDtcblxuICAgICQkJDEuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICQkJDEuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgICByZXR1cm4gQWxlcnQuX2pRdWVyeUludGVyZmFjZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFsZXJ0O1xuICB9KCQpO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBCb290c3RyYXAgKHY0LjEuMyk6IGJ1dHRvbi5qc1xuICAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgQnV0dG9uID0gZnVuY3Rpb24gKCQkJDEpIHtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDb25zdGFudHNcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cbiAgICB2YXIgTkFNRSA9ICdidXR0b24nO1xuICAgIHZhciBWRVJTSU9OID0gJzQuMS4zJztcbiAgICB2YXIgREFUQV9LRVkgPSAnYnMuYnV0dG9uJztcbiAgICB2YXIgRVZFTlRfS0VZID0gXCIuXCIgKyBEQVRBX0tFWTtcbiAgICB2YXIgREFUQV9BUElfS0VZID0gJy5kYXRhLWFwaSc7XG4gICAgdmFyIEpRVUVSWV9OT19DT05GTElDVCA9ICQkJDEuZm5bTkFNRV07XG4gICAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICAgIEFDVElWRTogJ2FjdGl2ZScsXG4gICAgICBCVVRUT046ICdidG4nLFxuICAgICAgRk9DVVM6ICdmb2N1cydcbiAgICB9O1xuICAgIHZhciBTZWxlY3RvciA9IHtcbiAgICAgIERBVEFfVE9HR0xFX0NBUlJPVDogJ1tkYXRhLXRvZ2dsZV49XCJidXR0b25cIl0nLFxuICAgICAgREFUQV9UT0dHTEU6ICdbZGF0YS10b2dnbGU9XCJidXR0b25zXCJdJyxcbiAgICAgIElOUFVUOiAnaW5wdXQnLFxuICAgICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgICBCVVRUT046ICcuYnRuJ1xuICAgIH07XG4gICAgdmFyIEV2ZW50ID0ge1xuICAgICAgQ0xJQ0tfREFUQV9BUEk6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWSxcbiAgICAgIEZPQ1VTX0JMVVJfREFUQV9BUEk6IFwiZm9jdXNcIiArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWSArIFwiIFwiICsgKFwiYmx1clwiICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZKVxuICAgICAgLyoqXG4gICAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAqIENsYXNzIERlZmluaXRpb25cbiAgICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICovXG5cbiAgICB9O1xuXG4gICAgdmFyIEJ1dHRvbiA9XG4gICAgLyojX19QVVJFX18qL1xuICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgIGZ1bmN0aW9uIEJ1dHRvbihlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgfSAvLyBHZXR0ZXJzXG5cblxuICAgICAgdmFyIF9wcm90byA9IEJ1dHRvbi5wcm90b3R5cGU7XG5cbiAgICAgIC8vIFB1YmxpY1xuICAgICAgX3Byb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZSgpIHtcbiAgICAgICAgdmFyIHRyaWdnZXJDaGFuZ2VFdmVudCA9IHRydWU7XG4gICAgICAgIHZhciBhZGRBcmlhUHJlc3NlZCA9IHRydWU7XG4gICAgICAgIHZhciByb290RWxlbWVudCA9ICQkJDEodGhpcy5fZWxlbWVudCkuY2xvc2VzdChTZWxlY3Rvci5EQVRBX1RPR0dMRSlbMF07XG5cbiAgICAgICAgaWYgKHJvb3RFbGVtZW50KSB7XG4gICAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5fZWxlbWVudC5xdWVyeVNlbGVjdG9yKFNlbGVjdG9yLklOUFVUKTtcblxuICAgICAgICAgIGlmIChpbnB1dCkge1xuICAgICAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgaWYgKGlucHV0LmNoZWNrZWQgJiYgdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoQ2xhc3NOYW1lLkFDVElWRSkpIHtcbiAgICAgICAgICAgICAgICB0cmlnZ2VyQ2hhbmdlRXZlbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgYWN0aXZlRWxlbWVudCA9IHJvb3RFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IuQUNUSVZFKTtcblxuICAgICAgICAgICAgICAgIGlmIChhY3RpdmVFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAkJCQxKGFjdGl2ZUVsZW1lbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHJpZ2dlckNoYW5nZUV2ZW50KSB7XG4gICAgICAgICAgICAgIGlmIChpbnB1dC5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJykgfHwgcm9vdEVsZW1lbnQuaGFzQXR0cmlidXRlKCdkaXNhYmxlZCcpIHx8IGlucHV0LmNsYXNzTGlzdC5jb250YWlucygnZGlzYWJsZWQnKSB8fCByb290RWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gIXRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICAgICAgICAkJCQxKGlucHV0KS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgIGFkZEFyaWFQcmVzc2VkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFkZEFyaWFQcmVzc2VkKSB7XG4gICAgICAgICAgdGhpcy5fZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtcHJlc3NlZCcsICF0aGlzLl9lbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhDbGFzc05hbWUuQUNUSVZFKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHJpZ2dlckNoYW5nZUV2ZW50KSB7XG4gICAgICAgICAgJCQkMSh0aGlzLl9lbGVtZW50KS50b2dnbGVDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgICAkJCQxLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICAgIEJ1dHRvbi5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSAkJCQxKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICBkYXRhID0gbmV3IEJ1dHRvbih0aGlzKTtcbiAgICAgICAgICAgICQkJDEodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGNvbmZpZyA9PT0gJ3RvZ2dsZScpIHtcbiAgICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBfY3JlYXRlQ2xhc3MoQnV0dG9uLCBudWxsLCBbe1xuICAgICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgICAgfVxuICAgICAgfV0pO1xuXG4gICAgICByZXR1cm4gQnV0dG9uO1xuICAgIH0oKTtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG5cbiAgICAkJCQxKGRvY3VtZW50KS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9UT0dHTEVfQ0FSUk9ULCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB2YXIgYnV0dG9uID0gZXZlbnQudGFyZ2V0O1xuXG4gICAgICBpZiAoISQkJDEoYnV0dG9uKS5oYXNDbGFzcyhDbGFzc05hbWUuQlVUVE9OKSkge1xuICAgICAgICBidXR0b24gPSAkJCQxKGJ1dHRvbikuY2xvc2VzdChTZWxlY3Rvci5CVVRUT04pO1xuICAgICAgfVxuXG4gICAgICBCdXR0b24uX2pRdWVyeUludGVyZmFjZS5jYWxsKCQkJDEoYnV0dG9uKSwgJ3RvZ2dsZScpO1xuICAgIH0pLm9uKEV2ZW50LkZPQ1VTX0JMVVJfREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfVE9HR0xFX0NBUlJPVCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICB2YXIgYnV0dG9uID0gJCQkMShldmVudC50YXJnZXQpLmNsb3Nlc3QoU2VsZWN0b3IuQlVUVE9OKVswXTtcbiAgICAgICQkJDEoYnV0dG9uKS50b2dnbGVDbGFzcyhDbGFzc05hbWUuRk9DVVMsIC9eZm9jdXMoaW4pPyQvLnRlc3QoZXZlbnQudHlwZSkpO1xuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIGpRdWVyeVxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG4gICAgJCQkMS5mbltOQU1FXSA9IEJ1dHRvbi5falF1ZXJ5SW50ZXJmYWNlO1xuICAgICQkJDEuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBCdXR0b247XG5cbiAgICAkJCQxLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkJCQxLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgICAgcmV0dXJuIEJ1dHRvbi5falF1ZXJ5SW50ZXJmYWNlO1xuICAgIH07XG5cbiAgICByZXR1cm4gQnV0dG9uO1xuICB9KCQpO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBCb290c3RyYXAgKHY0LjEuMyk6IGNhcm91c2VsLmpzXG4gICAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBDYXJvdXNlbCA9IGZ1bmN0aW9uICgkJCQxKSB7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogQ29uc3RhbnRzXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG4gICAgdmFyIE5BTUUgPSAnY2Fyb3VzZWwnO1xuICAgIHZhciBWRVJTSU9OID0gJzQuMS4zJztcbiAgICB2YXIgREFUQV9LRVkgPSAnYnMuY2Fyb3VzZWwnO1xuICAgIHZhciBFVkVOVF9LRVkgPSBcIi5cIiArIERBVEFfS0VZO1xuICAgIHZhciBEQVRBX0FQSV9LRVkgPSAnLmRhdGEtYXBpJztcbiAgICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJCQkMS5mbltOQU1FXTtcbiAgICB2YXIgQVJST1dfTEVGVF9LRVlDT0RFID0gMzc7IC8vIEtleWJvYXJkRXZlbnQud2hpY2ggdmFsdWUgZm9yIGxlZnQgYXJyb3cga2V5XG5cbiAgICB2YXIgQVJST1dfUklHSFRfS0VZQ09ERSA9IDM5OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciByaWdodCBhcnJvdyBrZXlcblxuICAgIHZhciBUT1VDSEVWRU5UX0NPTVBBVF9XQUlUID0gNTAwOyAvLyBUaW1lIGZvciBtb3VzZSBjb21wYXQgZXZlbnRzIHRvIGZpcmUgYWZ0ZXIgdG91Y2hcblxuICAgIHZhciBEZWZhdWx0ID0ge1xuICAgICAgaW50ZXJ2YWw6IDUwMDAsXG4gICAgICBrZXlib2FyZDogdHJ1ZSxcbiAgICAgIHNsaWRlOiBmYWxzZSxcbiAgICAgIHBhdXNlOiAnaG92ZXInLFxuICAgICAgd3JhcDogdHJ1ZVxuICAgIH07XG4gICAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgICAgaW50ZXJ2YWw6ICcobnVtYmVyfGJvb2xlYW4pJyxcbiAgICAgIGtleWJvYXJkOiAnYm9vbGVhbicsXG4gICAgICBzbGlkZTogJyhib29sZWFufHN0cmluZyknLFxuICAgICAgcGF1c2U6ICcoc3RyaW5nfGJvb2xlYW4pJyxcbiAgICAgIHdyYXA6ICdib29sZWFuJ1xuICAgIH07XG4gICAgdmFyIERpcmVjdGlvbiA9IHtcbiAgICAgIE5FWFQ6ICduZXh0JyxcbiAgICAgIFBSRVY6ICdwcmV2JyxcbiAgICAgIExFRlQ6ICdsZWZ0JyxcbiAgICAgIFJJR0hUOiAncmlnaHQnXG4gICAgfTtcbiAgICB2YXIgRXZlbnQgPSB7XG4gICAgICBTTElERTogXCJzbGlkZVwiICsgRVZFTlRfS0VZLFxuICAgICAgU0xJRDogXCJzbGlkXCIgKyBFVkVOVF9LRVksXG4gICAgICBLRVlET1dOOiBcImtleWRvd25cIiArIEVWRU5UX0tFWSxcbiAgICAgIE1PVVNFRU5URVI6IFwibW91c2VlbnRlclwiICsgRVZFTlRfS0VZLFxuICAgICAgTU9VU0VMRUFWRTogXCJtb3VzZWxlYXZlXCIgKyBFVkVOVF9LRVksXG4gICAgICBUT1VDSEVORDogXCJ0b3VjaGVuZFwiICsgRVZFTlRfS0VZLFxuICAgICAgTE9BRF9EQVRBX0FQSTogXCJsb2FkXCIgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVksXG4gICAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gICAgfTtcbiAgICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgICAgQ0FST1VTRUw6ICdjYXJvdXNlbCcsXG4gICAgICBBQ1RJVkU6ICdhY3RpdmUnLFxuICAgICAgU0xJREU6ICdzbGlkZScsXG4gICAgICBSSUdIVDogJ2Nhcm91c2VsLWl0ZW0tcmlnaHQnLFxuICAgICAgTEVGVDogJ2Nhcm91c2VsLWl0ZW0tbGVmdCcsXG4gICAgICBORVhUOiAnY2Fyb3VzZWwtaXRlbS1uZXh0JyxcbiAgICAgIFBSRVY6ICdjYXJvdXNlbC1pdGVtLXByZXYnLFxuICAgICAgSVRFTTogJ2Nhcm91c2VsLWl0ZW0nXG4gICAgfTtcbiAgICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgICBBQ1RJVkU6ICcuYWN0aXZlJyxcbiAgICAgIEFDVElWRV9JVEVNOiAnLmFjdGl2ZS5jYXJvdXNlbC1pdGVtJyxcbiAgICAgIElURU06ICcuY2Fyb3VzZWwtaXRlbScsXG4gICAgICBORVhUX1BSRVY6ICcuY2Fyb3VzZWwtaXRlbS1uZXh0LCAuY2Fyb3VzZWwtaXRlbS1wcmV2JyxcbiAgICAgIElORElDQVRPUlM6ICcuY2Fyb3VzZWwtaW5kaWNhdG9ycycsXG4gICAgICBEQVRBX1NMSURFOiAnW2RhdGEtc2xpZGVdLCBbZGF0YS1zbGlkZS10b10nLFxuICAgICAgREFUQV9SSURFOiAnW2RhdGEtcmlkZT1cImNhcm91c2VsXCJdJ1xuICAgICAgLyoqXG4gICAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAqIENsYXNzIERlZmluaXRpb25cbiAgICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICovXG5cbiAgICB9O1xuXG4gICAgdmFyIENhcm91c2VsID1cbiAgICAvKiNfX1BVUkVfXyovXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgZnVuY3Rpb24gQ2Fyb3VzZWwoZWxlbWVudCwgY29uZmlnKSB7XG4gICAgICAgIHRoaXMuX2l0ZW1zID0gbnVsbDtcbiAgICAgICAgdGhpcy5faW50ZXJ2YWwgPSBudWxsO1xuICAgICAgICB0aGlzLl9hY3RpdmVFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5faXNQYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faXNTbGlkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMudG91Y2hUaW1lb3V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQgPSAkJCQxKGVsZW1lbnQpWzBdO1xuICAgICAgICB0aGlzLl9pbmRpY2F0b3JzRWxlbWVudCA9IHRoaXMuX2VsZW1lbnQucXVlcnlTZWxlY3RvcihTZWxlY3Rvci5JTkRJQ0FUT1JTKTtcblxuICAgICAgICB0aGlzLl9hZGRFdmVudExpc3RlbmVycygpO1xuICAgICAgfSAvLyBHZXR0ZXJzXG5cblxuICAgICAgdmFyIF9wcm90byA9IENhcm91c2VsLnByb3RvdHlwZTtcblxuICAgICAgLy8gUHVibGljXG4gICAgICBfcHJvdG8ubmV4dCA9IGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgIGlmICghdGhpcy5faXNTbGlkaW5nKSB7XG4gICAgICAgICAgdGhpcy5fc2xpZGUoRGlyZWN0aW9uLk5FWFQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8ubmV4dFdoZW5WaXNpYmxlID0gZnVuY3Rpb24gbmV4dFdoZW5WaXNpYmxlKCkge1xuICAgICAgICAvLyBEb24ndCBjYWxsIG5leHQgd2hlbiB0aGUgcGFnZSBpc24ndCB2aXNpYmxlXG4gICAgICAgIC8vIG9yIHRoZSBjYXJvdXNlbCBvciBpdHMgcGFyZW50IGlzbid0IHZpc2libGVcbiAgICAgICAgaWYgKCFkb2N1bWVudC5oaWRkZW4gJiYgJCQkMSh0aGlzLl9lbGVtZW50KS5pcygnOnZpc2libGUnKSAmJiAkJCQxKHRoaXMuX2VsZW1lbnQpLmNzcygndmlzaWJpbGl0eScpICE9PSAnaGlkZGVuJykge1xuICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8ucHJldiA9IGZ1bmN0aW9uIHByZXYoKSB7XG4gICAgICAgIGlmICghdGhpcy5faXNTbGlkaW5nKSB7XG4gICAgICAgICAgdGhpcy5fc2xpZGUoRGlyZWN0aW9uLlBSRVYpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8ucGF1c2UgPSBmdW5jdGlvbiBwYXVzZShldmVudCkge1xuICAgICAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgICAgdGhpcy5faXNQYXVzZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2VsZW1lbnQucXVlcnlTZWxlY3RvcihTZWxlY3Rvci5ORVhUX1BSRVYpKSB7XG4gICAgICAgICAgVXRpbC50cmlnZ2VyVHJhbnNpdGlvbkVuZCh0aGlzLl9lbGVtZW50KTtcbiAgICAgICAgICB0aGlzLmN5Y2xlKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbCk7XG4gICAgICAgIHRoaXMuX2ludGVydmFsID0gbnVsbDtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5jeWNsZSA9IGZ1bmN0aW9uIGN5Y2xlKGV2ZW50KSB7XG4gICAgICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgICB0aGlzLl9pc1BhdXNlZCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2ludGVydmFsKSB7XG4gICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbCk7XG4gICAgICAgICAgdGhpcy5faW50ZXJ2YWwgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2NvbmZpZy5pbnRlcnZhbCAmJiAhdGhpcy5faXNQYXVzZWQpIHtcbiAgICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IHNldEludGVydmFsKChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPyB0aGlzLm5leHRXaGVuVmlzaWJsZSA6IHRoaXMubmV4dCkuYmluZCh0aGlzKSwgdGhpcy5fY29uZmlnLmludGVydmFsKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgX3Byb3RvLnRvID0gZnVuY3Rpb24gdG8oaW5kZXgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICB0aGlzLl9hY3RpdmVFbGVtZW50ID0gdGhpcy5fZWxlbWVudC5xdWVyeVNlbGVjdG9yKFNlbGVjdG9yLkFDVElWRV9JVEVNKTtcblxuICAgICAgICB2YXIgYWN0aXZlSW5kZXggPSB0aGlzLl9nZXRJdGVtSW5kZXgodGhpcy5fYWN0aXZlRWxlbWVudCk7XG5cbiAgICAgICAgaWYgKGluZGV4ID4gdGhpcy5faXRlbXMubGVuZ3RoIC0gMSB8fCBpbmRleCA8IDApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5faXNTbGlkaW5nKSB7XG4gICAgICAgICAgJCQkMSh0aGlzLl9lbGVtZW50KS5vbmUoRXZlbnQuU0xJRCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnRvKGluZGV4KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aXZlSW5kZXggPT09IGluZGV4KSB7XG4gICAgICAgICAgdGhpcy5wYXVzZSgpO1xuICAgICAgICAgIHRoaXMuY3ljbGUoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGlyZWN0aW9uID0gaW5kZXggPiBhY3RpdmVJbmRleCA/IERpcmVjdGlvbi5ORVhUIDogRGlyZWN0aW9uLlBSRVY7XG5cbiAgICAgICAgdGhpcy5fc2xpZGUoZGlyZWN0aW9uLCB0aGlzLl9pdGVtc1tpbmRleF0pO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLm9mZihFVkVOVF9LRVkpO1xuICAgICAgICAkJCQxLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgICB0aGlzLl9pdGVtcyA9IG51bGw7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IG51bGw7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2lzUGF1c2VkID0gbnVsbDtcbiAgICAgICAgdGhpcy5faXNTbGlkaW5nID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYWN0aXZlRWxlbWVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2luZGljYXRvcnNFbGVtZW50ID0gbnVsbDtcbiAgICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgICBfcHJvdG8uX2dldENvbmZpZyA9IGZ1bmN0aW9uIF9nZXRDb25maWcoY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIERlZmF1bHQsIGNvbmZpZyk7XG4gICAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUsIGNvbmZpZywgRGVmYXVsdFR5cGUpO1xuICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9hZGRFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uIF9hZGRFdmVudExpc3RlbmVycygpIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgaWYgKHRoaXMuX2NvbmZpZy5rZXlib2FyZCkge1xuICAgICAgICAgICQkJDEodGhpcy5fZWxlbWVudCkub24oRXZlbnQuS0VZRE9XTiwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLl9rZXlkb3duKGV2ZW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9jb25maWcucGF1c2UgPT09ICdob3ZlcicpIHtcbiAgICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50Lk1PVVNFRU5URVIsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzMi5wYXVzZShldmVudCk7XG4gICAgICAgICAgfSkub24oRXZlbnQuTU9VU0VMRUFWRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLmN5Y2xlKGV2ZW50KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmICgnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vIElmIGl0J3MgYSB0b3VjaC1lbmFibGVkIGRldmljZSwgbW91c2VlbnRlci9sZWF2ZSBhcmUgZmlyZWQgYXNcbiAgICAgICAgICAgIC8vIHBhcnQgb2YgdGhlIG1vdXNlIGNvbXBhdGliaWxpdHkgZXZlbnRzIG9uIGZpcnN0IHRhcCAtIHRoZSBjYXJvdXNlbFxuICAgICAgICAgICAgLy8gd291bGQgc3RvcCBjeWNsaW5nIHVudGlsIHVzZXIgdGFwcGVkIG91dCBvZiBpdDtcbiAgICAgICAgICAgIC8vIGhlcmUsIHdlIGxpc3RlbiBmb3IgdG91Y2hlbmQsIGV4cGxpY2l0bHkgcGF1c2UgdGhlIGNhcm91c2VsXG4gICAgICAgICAgICAvLyAoYXMgaWYgaXQncyB0aGUgc2Vjb25kIHRpbWUgd2UgdGFwIG9uIGl0LCBtb3VzZWVudGVyIGNvbXBhdCBldmVudFxuICAgICAgICAgICAgLy8gaXMgTk9UIGZpcmVkKSBhbmQgYWZ0ZXIgYSB0aW1lb3V0ICh0byBhbGxvdyBmb3IgbW91c2UgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgLy8gZXZlbnRzIHRvIGZpcmUpIHdlIGV4cGxpY2l0bHkgcmVzdGFydCBjeWNsaW5nXG4gICAgICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50LlRPVUNIRU5ELCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIF90aGlzMi5wYXVzZSgpO1xuXG4gICAgICAgICAgICAgIGlmIChfdGhpczIudG91Y2hUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzMi50b3VjaFRpbWVvdXQpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgX3RoaXMyLnRvdWNoVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzMi5jeWNsZShldmVudCk7XG4gICAgICAgICAgICAgIH0sIFRPVUNIRVZFTlRfQ09NUEFUX1dBSVQgKyBfdGhpczIuX2NvbmZpZy5pbnRlcnZhbCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fa2V5ZG93biA9IGZ1bmN0aW9uIF9rZXlkb3duKGV2ZW50KSB7XG4gICAgICAgIGlmICgvaW5wdXR8dGV4dGFyZWEvaS50ZXN0KGV2ZW50LnRhcmdldC50YWdOYW1lKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoZXZlbnQud2hpY2gpIHtcbiAgICAgICAgICBjYXNlIEFSUk9XX0xFRlRfS0VZQ09ERTpcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLnByZXYoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBBUlJPV19SSUdIVF9LRVlDT0RFOlxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2dldEl0ZW1JbmRleCA9IGZ1bmN0aW9uIF9nZXRJdGVtSW5kZXgoZWxlbWVudCkge1xuICAgICAgICB0aGlzLl9pdGVtcyA9IGVsZW1lbnQgJiYgZWxlbWVudC5wYXJlbnROb2RlID8gW10uc2xpY2UuY2FsbChlbGVtZW50LnBhcmVudE5vZGUucXVlcnlTZWxlY3RvckFsbChTZWxlY3Rvci5JVEVNKSkgOiBbXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZW1zLmluZGV4T2YoZWxlbWVudCk7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2dldEl0ZW1CeURpcmVjdGlvbiA9IGZ1bmN0aW9uIF9nZXRJdGVtQnlEaXJlY3Rpb24oZGlyZWN0aW9uLCBhY3RpdmVFbGVtZW50KSB7XG4gICAgICAgIHZhciBpc05leHREaXJlY3Rpb24gPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ORVhUO1xuICAgICAgICB2YXIgaXNQcmV2RGlyZWN0aW9uID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUFJFVjtcblxuICAgICAgICB2YXIgYWN0aXZlSW5kZXggPSB0aGlzLl9nZXRJdGVtSW5kZXgoYWN0aXZlRWxlbWVudCk7XG5cbiAgICAgICAgdmFyIGxhc3RJdGVtSW5kZXggPSB0aGlzLl9pdGVtcy5sZW5ndGggLSAxO1xuICAgICAgICB2YXIgaXNHb2luZ1RvV3JhcCA9IGlzUHJldkRpcmVjdGlvbiAmJiBhY3RpdmVJbmRleCA9PT0gMCB8fCBpc05leHREaXJlY3Rpb24gJiYgYWN0aXZlSW5kZXggPT09IGxhc3RJdGVtSW5kZXg7XG5cbiAgICAgICAgaWYgKGlzR29pbmdUb1dyYXAgJiYgIXRoaXMuX2NvbmZpZy53cmFwKSB7XG4gICAgICAgICAgcmV0dXJuIGFjdGl2ZUVsZW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGVsdGEgPSBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5QUkVWID8gLTEgOiAxO1xuICAgICAgICB2YXIgaXRlbUluZGV4ID0gKGFjdGl2ZUluZGV4ICsgZGVsdGEpICUgdGhpcy5faXRlbXMubGVuZ3RoO1xuICAgICAgICByZXR1cm4gaXRlbUluZGV4ID09PSAtMSA/IHRoaXMuX2l0ZW1zW3RoaXMuX2l0ZW1zLmxlbmd0aCAtIDFdIDogdGhpcy5faXRlbXNbaXRlbUluZGV4XTtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fdHJpZ2dlclNsaWRlRXZlbnQgPSBmdW5jdGlvbiBfdHJpZ2dlclNsaWRlRXZlbnQocmVsYXRlZFRhcmdldCwgZXZlbnREaXJlY3Rpb25OYW1lKSB7XG4gICAgICAgIHZhciB0YXJnZXRJbmRleCA9IHRoaXMuX2dldEl0ZW1JbmRleChyZWxhdGVkVGFyZ2V0KTtcblxuICAgICAgICB2YXIgZnJvbUluZGV4ID0gdGhpcy5fZ2V0SXRlbUluZGV4KHRoaXMuX2VsZW1lbnQucXVlcnlTZWxlY3RvcihTZWxlY3Rvci5BQ1RJVkVfSVRFTSkpO1xuXG4gICAgICAgIHZhciBzbGlkZUV2ZW50ID0gJCQkMS5FdmVudChFdmVudC5TTElERSwge1xuICAgICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHJlbGF0ZWRUYXJnZXQsXG4gICAgICAgICAgZGlyZWN0aW9uOiBldmVudERpcmVjdGlvbk5hbWUsXG4gICAgICAgICAgZnJvbTogZnJvbUluZGV4LFxuICAgICAgICAgIHRvOiB0YXJnZXRJbmRleFxuICAgICAgICB9KTtcbiAgICAgICAgJCQkMSh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNsaWRlRXZlbnQpO1xuICAgICAgICByZXR1cm4gc2xpZGVFdmVudDtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fc2V0QWN0aXZlSW5kaWNhdG9yRWxlbWVudCA9IGZ1bmN0aW9uIF9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2luZGljYXRvcnNFbGVtZW50KSB7XG4gICAgICAgICAgdmFyIGluZGljYXRvcnMgPSBbXS5zbGljZS5jYWxsKHRoaXMuX2luZGljYXRvcnNFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IuQUNUSVZFKSk7XG4gICAgICAgICAgJCQkMShpbmRpY2F0b3JzKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcblxuICAgICAgICAgIHZhciBuZXh0SW5kaWNhdG9yID0gdGhpcy5faW5kaWNhdG9yc0VsZW1lbnQuY2hpbGRyZW5bdGhpcy5fZ2V0SXRlbUluZGV4KGVsZW1lbnQpXTtcblxuICAgICAgICAgIGlmIChuZXh0SW5kaWNhdG9yKSB7XG4gICAgICAgICAgICAkJCQxKG5leHRJbmRpY2F0b3IpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9zbGlkZSA9IGZ1bmN0aW9uIF9zbGlkZShkaXJlY3Rpb24sIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGFjdGl2ZUVsZW1lbnQgPSB0aGlzLl9lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IuQUNUSVZFX0lURU0pO1xuXG4gICAgICAgIHZhciBhY3RpdmVFbGVtZW50SW5kZXggPSB0aGlzLl9nZXRJdGVtSW5kZXgoYWN0aXZlRWxlbWVudCk7XG5cbiAgICAgICAgdmFyIG5leHRFbGVtZW50ID0gZWxlbWVudCB8fCBhY3RpdmVFbGVtZW50ICYmIHRoaXMuX2dldEl0ZW1CeURpcmVjdGlvbihkaXJlY3Rpb24sIGFjdGl2ZUVsZW1lbnQpO1xuXG4gICAgICAgIHZhciBuZXh0RWxlbWVudEluZGV4ID0gdGhpcy5fZ2V0SXRlbUluZGV4KG5leHRFbGVtZW50KTtcblxuICAgICAgICB2YXIgaXNDeWNsaW5nID0gQm9vbGVhbih0aGlzLl9pbnRlcnZhbCk7XG4gICAgICAgIHZhciBkaXJlY3Rpb25hbENsYXNzTmFtZTtcbiAgICAgICAgdmFyIG9yZGVyQ2xhc3NOYW1lO1xuICAgICAgICB2YXIgZXZlbnREaXJlY3Rpb25OYW1lO1xuXG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ORVhUKSB7XG4gICAgICAgICAgZGlyZWN0aW9uYWxDbGFzc05hbWUgPSBDbGFzc05hbWUuTEVGVDtcbiAgICAgICAgICBvcmRlckNsYXNzTmFtZSA9IENsYXNzTmFtZS5ORVhUO1xuICAgICAgICAgIGV2ZW50RGlyZWN0aW9uTmFtZSA9IERpcmVjdGlvbi5MRUZUO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRpcmVjdGlvbmFsQ2xhc3NOYW1lID0gQ2xhc3NOYW1lLlJJR0hUO1xuICAgICAgICAgIG9yZGVyQ2xhc3NOYW1lID0gQ2xhc3NOYW1lLlBSRVY7XG4gICAgICAgICAgZXZlbnREaXJlY3Rpb25OYW1lID0gRGlyZWN0aW9uLlJJR0hUO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5leHRFbGVtZW50ICYmICQkJDEobmV4dEVsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5BQ1RJVkUpKSB7XG4gICAgICAgICAgdGhpcy5faXNTbGlkaW5nID0gZmFsc2U7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNsaWRlRXZlbnQgPSB0aGlzLl90cmlnZ2VyU2xpZGVFdmVudChuZXh0RWxlbWVudCwgZXZlbnREaXJlY3Rpb25OYW1lKTtcblxuICAgICAgICBpZiAoc2xpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghYWN0aXZlRWxlbWVudCB8fCAhbmV4dEVsZW1lbnQpIHtcbiAgICAgICAgICAvLyBTb21lIHdlaXJkbmVzcyBpcyBoYXBwZW5pbmcsIHNvIHdlIGJhaWxcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9pc1NsaWRpbmcgPSB0cnVlO1xuXG4gICAgICAgIGlmIChpc0N5Y2xpbmcpIHtcbiAgICAgICAgICB0aGlzLnBhdXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KG5leHRFbGVtZW50KTtcblxuICAgICAgICB2YXIgc2xpZEV2ZW50ID0gJCQkMS5FdmVudChFdmVudC5TTElELCB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogbmV4dEVsZW1lbnQsXG4gICAgICAgICAgZGlyZWN0aW9uOiBldmVudERpcmVjdGlvbk5hbWUsXG4gICAgICAgICAgZnJvbTogYWN0aXZlRWxlbWVudEluZGV4LFxuICAgICAgICAgIHRvOiBuZXh0RWxlbWVudEluZGV4XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkJCQxKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TTElERSkpIHtcbiAgICAgICAgICAkJCQxKG5leHRFbGVtZW50KS5hZGRDbGFzcyhvcmRlckNsYXNzTmFtZSk7XG4gICAgICAgICAgVXRpbC5yZWZsb3cobmV4dEVsZW1lbnQpO1xuICAgICAgICAgICQkJDEoYWN0aXZlRWxlbWVudCkuYWRkQ2xhc3MoZGlyZWN0aW9uYWxDbGFzc05hbWUpO1xuICAgICAgICAgICQkJDEobmV4dEVsZW1lbnQpLmFkZENsYXNzKGRpcmVjdGlvbmFsQ2xhc3NOYW1lKTtcbiAgICAgICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudChhY3RpdmVFbGVtZW50KTtcbiAgICAgICAgICAkJCQxKGFjdGl2ZUVsZW1lbnQpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkJCQxKG5leHRFbGVtZW50KS5yZW1vdmVDbGFzcyhkaXJlY3Rpb25hbENsYXNzTmFtZSArIFwiIFwiICsgb3JkZXJDbGFzc05hbWUpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICAgICAgJCQkMShhY3RpdmVFbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQUNUSVZFICsgXCIgXCIgKyBvcmRlckNsYXNzTmFtZSArIFwiIFwiICsgZGlyZWN0aW9uYWxDbGFzc05hbWUpO1xuICAgICAgICAgICAgX3RoaXMzLl9pc1NsaWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByZXR1cm4gJCQkMShfdGhpczMuX2VsZW1lbnQpLnRyaWdnZXIoc2xpZEV2ZW50KTtcbiAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgIH0pLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCQkMShhY3RpdmVFbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgICAgICAkJCQxKG5leHRFbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgICAgICB0aGlzLl9pc1NsaWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoc2xpZEV2ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0N5Y2xpbmcpIHtcbiAgICAgICAgICB0aGlzLmN5Y2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICAgIENhcm91c2VsLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9ICQkJDEodGhpcykuZGF0YShEQVRBX0tFWSk7XG5cbiAgICAgICAgICB2YXIgX2NvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIERlZmF1bHQsICQkJDEodGhpcykuZGF0YSgpKTtcblxuICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgX2NvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIF9jb25maWcsIGNvbmZpZyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGFjdGlvbiA9IHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnID8gY29uZmlnIDogX2NvbmZpZy5zbGlkZTtcblxuICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgZGF0YSA9IG5ldyBDYXJvdXNlbCh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAgICQkJDEodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBkYXRhLnRvKGNvbmZpZyk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYWN0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2FjdGlvbl0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgYWN0aW9uICsgXCJcXFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRhW2FjdGlvbl0oKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKF9jb25maWcuaW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIGRhdGEucGF1c2UoKTtcbiAgICAgICAgICAgIGRhdGEuY3ljbGUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgQ2Fyb3VzZWwuX2RhdGFBcGlDbGlja0hhbmRsZXIgPSBmdW5jdGlvbiBfZGF0YUFwaUNsaWNrSGFuZGxlcihldmVudCkge1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQodGhpcyk7XG5cbiAgICAgICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0YXJnZXQgPSAkJCQxKHNlbGVjdG9yKVswXTtcblxuICAgICAgICBpZiAoIXRhcmdldCB8fCAhJCQkMSh0YXJnZXQpLmhhc0NsYXNzKENsYXNzTmFtZS5DQVJPVVNFTCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgJCQkMSh0YXJnZXQpLmRhdGEoKSwgJCQkMSh0aGlzKS5kYXRhKCkpO1xuXG4gICAgICAgIHZhciBzbGlkZUluZGV4ID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGEtc2xpZGUtdG8nKTtcblxuICAgICAgICBpZiAoc2xpZGVJbmRleCkge1xuICAgICAgICAgIGNvbmZpZy5pbnRlcnZhbCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgQ2Fyb3VzZWwuX2pRdWVyeUludGVyZmFjZS5jYWxsKCQkJDEodGFyZ2V0KSwgY29uZmlnKTtcblxuICAgICAgICBpZiAoc2xpZGVJbmRleCkge1xuICAgICAgICAgICQkJDEodGFyZ2V0KS5kYXRhKERBVEFfS0VZKS50byhzbGlkZUluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9O1xuXG4gICAgICBfY3JlYXRlQ2xhc3MoQ2Fyb3VzZWwsIG51bGwsIFt7XG4gICAgICAgIGtleTogXCJWRVJTSU9OXCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBWRVJTSU9OO1xuICAgICAgICB9XG4gICAgICB9LCB7XG4gICAgICAgIGtleTogXCJEZWZhdWx0XCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBEZWZhdWx0O1xuICAgICAgICB9XG4gICAgICB9XSk7XG5cbiAgICAgIHJldHVybiBDYXJvdXNlbDtcbiAgICB9KCk7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogRGF0YSBBcGkgaW1wbGVtZW50YXRpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuXG4gICAgJCQkMShkb2N1bWVudCkub24oRXZlbnQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfU0xJREUsIENhcm91c2VsLl9kYXRhQXBpQ2xpY2tIYW5kbGVyKTtcbiAgICAkJCQxKHdpbmRvdykub24oRXZlbnQuTE9BRF9EQVRBX0FQSSwgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNhcm91c2VscyA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3Rvci5EQVRBX1JJREUpKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhcm91c2Vscy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgJGNhcm91c2VsID0gJCQkMShjYXJvdXNlbHNbaV0pO1xuXG4gICAgICAgIENhcm91c2VsLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkY2Fyb3VzZWwsICRjYXJvdXNlbC5kYXRhKCkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIGpRdWVyeVxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG4gICAgJCQkMS5mbltOQU1FXSA9IENhcm91c2VsLl9qUXVlcnlJbnRlcmZhY2U7XG4gICAgJCQkMS5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IENhcm91c2VsO1xuXG4gICAgJCQkMS5mbltOQU1FXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgJCQkMS5mbltOQU1FXSA9IEpRVUVSWV9OT19DT05GTElDVDtcbiAgICAgIHJldHVybiBDYXJvdXNlbC5falF1ZXJ5SW50ZXJmYWNlO1xuICAgIH07XG5cbiAgICByZXR1cm4gQ2Fyb3VzZWw7XG4gIH0oJCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIEJvb3RzdHJhcCAodjQuMS4zKTogY29sbGFwc2UuanNcbiAgICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvYmxvYi9tYXN0ZXIvTElDRU5TRSlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIENvbGxhcHNlID0gZnVuY3Rpb24gKCQkJDEpIHtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDb25zdGFudHNcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cbiAgICB2YXIgTkFNRSA9ICdjb2xsYXBzZSc7XG4gICAgdmFyIFZFUlNJT04gPSAnNC4xLjMnO1xuICAgIHZhciBEQVRBX0tFWSA9ICdicy5jb2xsYXBzZSc7XG4gICAgdmFyIEVWRU5UX0tFWSA9IFwiLlwiICsgREFUQV9LRVk7XG4gICAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICAgIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkJCQxLmZuW05BTUVdO1xuICAgIHZhciBEZWZhdWx0ID0ge1xuICAgICAgdG9nZ2xlOiB0cnVlLFxuICAgICAgcGFyZW50OiAnJ1xuICAgIH07XG4gICAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgICAgdG9nZ2xlOiAnYm9vbGVhbicsXG4gICAgICBwYXJlbnQ6ICcoc3RyaW5nfGVsZW1lbnQpJ1xuICAgIH07XG4gICAgdmFyIEV2ZW50ID0ge1xuICAgICAgU0hPVzogXCJzaG93XCIgKyBFVkVOVF9LRVksXG4gICAgICBTSE9XTjogXCJzaG93blwiICsgRVZFTlRfS0VZLFxuICAgICAgSElERTogXCJoaWRlXCIgKyBFVkVOVF9LRVksXG4gICAgICBISURERU46IFwiaGlkZGVuXCIgKyBFVkVOVF9LRVksXG4gICAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gICAgfTtcbiAgICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgICAgU0hPVzogJ3Nob3cnLFxuICAgICAgQ09MTEFQU0U6ICdjb2xsYXBzZScsXG4gICAgICBDT0xMQVBTSU5HOiAnY29sbGFwc2luZycsXG4gICAgICBDT0xMQVBTRUQ6ICdjb2xsYXBzZWQnXG4gICAgfTtcbiAgICB2YXIgRGltZW5zaW9uID0ge1xuICAgICAgV0lEVEg6ICd3aWR0aCcsXG4gICAgICBIRUlHSFQ6ICdoZWlnaHQnXG4gICAgfTtcbiAgICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgICBBQ1RJVkVTOiAnLnNob3csIC5jb2xsYXBzaW5nJyxcbiAgICAgIERBVEFfVE9HR0xFOiAnW2RhdGEtdG9nZ2xlPVwiY29sbGFwc2VcIl0nXG4gICAgICAvKipcbiAgICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgKi9cblxuICAgIH07XG5cbiAgICB2YXIgQ29sbGFwc2UgPVxuICAgIC8qI19fUFVSRV9fKi9cbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBmdW5jdGlvbiBDb2xsYXBzZShlbGVtZW50LCBjb25maWcpIHtcbiAgICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgICB0aGlzLl9jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgICAgdGhpcy5fdHJpZ2dlckFycmF5ID0gJCQkMS5tYWtlQXJyYXkoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLXRvZ2dsZT1cXFwiY29sbGFwc2VcXFwiXVtocmVmPVxcXCIjXCIgKyBlbGVtZW50LmlkICsgXCJcXFwiXSxcIiArIChcIltkYXRhLXRvZ2dsZT1cXFwiY29sbGFwc2VcXFwiXVtkYXRhLXRhcmdldD1cXFwiI1wiICsgZWxlbWVudC5pZCArIFwiXFxcIl1cIikpKTtcbiAgICAgICAgdmFyIHRvZ2dsZUxpc3QgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IuREFUQV9UT0dHTEUpKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdG9nZ2xlTGlzdC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIHZhciBlbGVtID0gdG9nZ2xlTGlzdFtpXTtcbiAgICAgICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbSk7XG4gICAgICAgICAgdmFyIGZpbHRlckVsZW1lbnQgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKS5maWx0ZXIoZnVuY3Rpb24gKGZvdW5kRWxlbSkge1xuICAgICAgICAgICAgcmV0dXJuIGZvdW5kRWxlbSA9PT0gZWxlbWVudDtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChzZWxlY3RvciAhPT0gbnVsbCAmJiBmaWx0ZXJFbGVtZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG5cbiAgICAgICAgICAgIHRoaXMuX3RyaWdnZXJBcnJheS5wdXNoKGVsZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHRoaXMuX2NvbmZpZy5wYXJlbnQgPyB0aGlzLl9nZXRQYXJlbnQoKSA6IG51bGw7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9jb25maWcucGFyZW50KSB7XG4gICAgICAgICAgdGhpcy5fYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKHRoaXMuX2VsZW1lbnQsIHRoaXMuX3RyaWdnZXJBcnJheSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fY29uZmlnLnRvZ2dsZSkge1xuICAgICAgICAgIHRoaXMudG9nZ2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH0gLy8gR2V0dGVyc1xuXG5cbiAgICAgIHZhciBfcHJvdG8gPSBDb2xsYXBzZS5wcm90b3R5cGU7XG5cbiAgICAgIC8vIFB1YmxpY1xuICAgICAgX3Byb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZSgpIHtcbiAgICAgICAgaWYgKCQkJDEodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpKSB7XG4gICAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICBpZiAodGhpcy5faXNUcmFuc2l0aW9uaW5nIHx8ICQkJDEodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFjdGl2ZXM7XG4gICAgICAgIHZhciBhY3RpdmVzRGF0YTtcblxuICAgICAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgICAgYWN0aXZlcyA9IFtdLnNsaWNlLmNhbGwodGhpcy5fcGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IuQUNUSVZFUykpLmZpbHRlcihmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKCdkYXRhLXBhcmVudCcpID09PSBfdGhpcy5fY29uZmlnLnBhcmVudDtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChhY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgYWN0aXZlcyA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFjdGl2ZXMpIHtcbiAgICAgICAgICBhY3RpdmVzRGF0YSA9ICQkJDEoYWN0aXZlcykubm90KHRoaXMuX3NlbGVjdG9yKS5kYXRhKERBVEFfS0VZKTtcblxuICAgICAgICAgIGlmIChhY3RpdmVzRGF0YSAmJiBhY3RpdmVzRGF0YS5faXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN0YXJ0RXZlbnQgPSAkJCQxLkV2ZW50KEV2ZW50LlNIT1cpO1xuICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoc3RhcnRFdmVudCk7XG5cbiAgICAgICAgaWYgKHN0YXJ0RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aXZlcykge1xuICAgICAgICAgIENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkJCQxKGFjdGl2ZXMpLm5vdCh0aGlzLl9zZWxlY3RvciksICdoaWRlJyk7XG5cbiAgICAgICAgICBpZiAoIWFjdGl2ZXNEYXRhKSB7XG4gICAgICAgICAgICAkJCQxKGFjdGl2ZXMpLmRhdGEoREFUQV9LRVksIG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkaW1lbnNpb24gPSB0aGlzLl9nZXREaW1lbnNpb24oKTtcblxuICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5DT0xMQVBTRSkuYWRkQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNJTkcpO1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSAwO1xuXG4gICAgICAgIGlmICh0aGlzLl90cmlnZ2VyQXJyYXkubGVuZ3RoKSB7XG4gICAgICAgICAgJCQkMSh0aGlzLl90cmlnZ2VyQXJyYXkpLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5DT0xMQVBTRUQpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0VHJhbnNpdGlvbmluZyh0cnVlKTtcblxuICAgICAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgICAkJCQxKF90aGlzLl9lbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0lORykuYWRkQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFKS5hZGRDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG4gICAgICAgICAgX3RoaXMuX2VsZW1lbnQuc3R5bGVbZGltZW5zaW9uXSA9ICcnO1xuXG4gICAgICAgICAgX3RoaXMuc2V0VHJhbnNpdGlvbmluZyhmYWxzZSk7XG5cbiAgICAgICAgICAkJCQxKF90aGlzLl9lbGVtZW50KS50cmlnZ2VyKEV2ZW50LlNIT1dOKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY2FwaXRhbGl6ZWREaW1lbnNpb24gPSBkaW1lbnNpb25bMF0udG9VcHBlckNhc2UoKSArIGRpbWVuc2lvbi5zbGljZSgxKTtcbiAgICAgICAgdmFyIHNjcm9sbFNpemUgPSBcInNjcm9sbFwiICsgY2FwaXRhbGl6ZWREaW1lbnNpb247XG4gICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQodHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gdGhpcy5fZWxlbWVudFtzY3JvbGxTaXplXSArIFwicHhcIjtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5oaWRlID0gZnVuY3Rpb24gaGlkZSgpIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZyB8fCAhJCQkMSh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuU0hPVykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3RhcnRFdmVudCA9ICQkJDEuRXZlbnQoRXZlbnQuSElERSk7XG4gICAgICAgICQkJDEodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzdGFydEV2ZW50KTtcblxuICAgICAgICBpZiAoc3RhcnRFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkaW1lbnNpb24gPSB0aGlzLl9nZXREaW1lbnNpb24oKTtcblxuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSB0aGlzLl9lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW2RpbWVuc2lvbl0gKyBcInB4XCI7XG4gICAgICAgIFV0aWwucmVmbG93KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZS5DT0xMQVBTSU5HKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0UpLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5TSE9XKTtcbiAgICAgICAgdmFyIHRyaWdnZXJBcnJheUxlbmd0aCA9IHRoaXMuX3RyaWdnZXJBcnJheS5sZW5ndGg7XG5cbiAgICAgICAgaWYgKHRyaWdnZXJBcnJheUxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRyaWdnZXJBcnJheUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdHJpZ2dlciA9IHRoaXMuX3RyaWdnZXJBcnJheVtpXTtcbiAgICAgICAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0cmlnZ2VyKTtcblxuICAgICAgICAgICAgaWYgKHNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciAkZWxlbSA9ICQkJDEoW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSkpO1xuXG4gICAgICAgICAgICAgIGlmICghJGVsZW0uaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpKSB7XG4gICAgICAgICAgICAgICAgJCQkMSh0cmlnZ2VyKS5hZGRDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0VEKS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgZmFsc2UpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXRUcmFuc2l0aW9uaW5nKHRydWUpO1xuXG4gICAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAgIF90aGlzMi5zZXRUcmFuc2l0aW9uaW5nKGZhbHNlKTtcblxuICAgICAgICAgICQkJDEoX3RoaXMyLl9lbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0lORykuYWRkQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFKS50cmlnZ2VyKEV2ZW50LkhJRERFTik7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gJyc7XG4gICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQodHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5zZXRUcmFuc2l0aW9uaW5nID0gZnVuY3Rpb24gc2V0VHJhbnNpdGlvbmluZyhpc1RyYW5zaXRpb25pbmcpIHtcbiAgICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gaXNUcmFuc2l0aW9uaW5nO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgICAkJCQxLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgICB0aGlzLl9jb25maWcgPSBudWxsO1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBudWxsO1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fdHJpZ2dlckFycmF5ID0gbnVsbDtcbiAgICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gbnVsbDtcbiAgICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgICBfcHJvdG8uX2dldENvbmZpZyA9IGZ1bmN0aW9uIF9nZXRDb25maWcoY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIERlZmF1bHQsIGNvbmZpZyk7XG4gICAgICAgIGNvbmZpZy50b2dnbGUgPSBCb29sZWFuKGNvbmZpZy50b2dnbGUpOyAvLyBDb2VyY2Ugc3RyaW5nIHZhbHVlc1xuXG4gICAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUsIGNvbmZpZywgRGVmYXVsdFR5cGUpO1xuICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9nZXREaW1lbnNpb24gPSBmdW5jdGlvbiBfZ2V0RGltZW5zaW9uKCkge1xuICAgICAgICB2YXIgaGFzV2lkdGggPSAkJCQxKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKERpbWVuc2lvbi5XSURUSCk7XG4gICAgICAgIHJldHVybiBoYXNXaWR0aCA/IERpbWVuc2lvbi5XSURUSCA6IERpbWVuc2lvbi5IRUlHSFQ7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2dldFBhcmVudCA9IGZ1bmN0aW9uIF9nZXRQYXJlbnQoKSB7XG4gICAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAgIHZhciBwYXJlbnQgPSBudWxsO1xuXG4gICAgICAgIGlmIChVdGlsLmlzRWxlbWVudCh0aGlzLl9jb25maWcucGFyZW50KSkge1xuICAgICAgICAgIHBhcmVudCA9IHRoaXMuX2NvbmZpZy5wYXJlbnQ7IC8vIEl0J3MgYSBqUXVlcnkgb2JqZWN0XG5cbiAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2NvbmZpZy5wYXJlbnQuanF1ZXJ5ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcGFyZW50ID0gdGhpcy5fY29uZmlnLnBhcmVudFswXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0aGlzLl9jb25maWcucGFyZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzZWxlY3RvciA9IFwiW2RhdGEtdG9nZ2xlPVxcXCJjb2xsYXBzZVxcXCJdW2RhdGEtcGFyZW50PVxcXCJcIiArIHRoaXMuX2NvbmZpZy5wYXJlbnQgKyBcIlxcXCJdXCI7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdLnNsaWNlLmNhbGwocGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbiAgICAgICAgJCQkMShjaGlsZHJlbikuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgICAgIF90aGlzMy5fYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudChlbGVtZW50KSwgW2VsZW1lbnRdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2FkZEFyaWFBbmRDb2xsYXBzZWRDbGFzcyA9IGZ1bmN0aW9uIF9hZGRBcmlhQW5kQ29sbGFwc2VkQ2xhc3MoZWxlbWVudCwgdHJpZ2dlckFycmF5KSB7XG4gICAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgICAgdmFyIGlzT3BlbiA9ICQkJDEoZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICAgICAgaWYgKHRyaWdnZXJBcnJheS5sZW5ndGgpIHtcbiAgICAgICAgICAgICQkJDEodHJpZ2dlckFycmF5KS50b2dnbGVDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0VELCAhaXNPcGVuKS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgaXNPcGVuKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICAgIENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudCA9IGZ1bmN0aW9uIF9nZXRUYXJnZXRGcm9tRWxlbWVudChlbGVtZW50KSB7XG4gICAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIHNlbGVjdG9yID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcikgOiBudWxsO1xuICAgICAgfTtcblxuICAgICAgQ29sbGFwc2UuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciAkdGhpcyA9ICQkJDEodGhpcyk7XG4gICAgICAgICAgdmFyIGRhdGEgPSAkdGhpcy5kYXRhKERBVEFfS0VZKTtcblxuICAgICAgICAgIHZhciBfY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCwgJHRoaXMuZGF0YSgpLCB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyAmJiBjb25maWcgPyBjb25maWcgOiB7fSk7XG5cbiAgICAgICAgICBpZiAoIWRhdGEgJiYgX2NvbmZpZy50b2dnbGUgJiYgL3Nob3d8aGlkZS8udGVzdChjb25maWcpKSB7XG4gICAgICAgICAgICBfY29uZmlnLnRvZ2dsZSA9IGZhbHNlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgZGF0YSA9IG5ldyBDb2xsYXBzZSh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAgICR0aGlzLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgX2NyZWF0ZUNsYXNzKENvbGxhcHNlLCBudWxsLCBbe1xuICAgICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgICAgfVxuICAgICAgfSwge1xuICAgICAgICBrZXk6IFwiRGVmYXVsdFwiLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gRGVmYXVsdDtcbiAgICAgICAgfVxuICAgICAgfV0pO1xuXG4gICAgICByZXR1cm4gQ29sbGFwc2U7XG4gICAgfSgpO1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cblxuICAgICQkJDEoZG9jdW1lbnQpLm9uKEV2ZW50LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3Rvci5EQVRBX1RPR0dMRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAvLyBwcmV2ZW50RGVmYXVsdCBvbmx5IGZvciA8YT4gZWxlbWVudHMgKHdoaWNoIGNoYW5nZSB0aGUgVVJMKSBub3QgaW5zaWRlIHRoZSBjb2xsYXBzaWJsZSBlbGVtZW50XG4gICAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC50YWdOYW1lID09PSAnQScpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cblxuICAgICAgdmFyICR0cmlnZ2VyID0gJCQkMSh0aGlzKTtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzKTtcbiAgICAgIHZhciBzZWxlY3RvcnMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbiAgICAgICQkJDEoc2VsZWN0b3JzKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkJCQxKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICR0YXJnZXQuZGF0YShEQVRBX0tFWSk7XG4gICAgICAgIHZhciBjb25maWcgPSBkYXRhID8gJ3RvZ2dsZScgOiAkdHJpZ2dlci5kYXRhKCk7XG5cbiAgICAgICAgQ29sbGFwc2UuX2pRdWVyeUludGVyZmFjZS5jYWxsKCR0YXJnZXQsIGNvbmZpZyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBqUXVlcnlcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICAgICQkJDEuZm5bTkFNRV0gPSBDb2xsYXBzZS5falF1ZXJ5SW50ZXJmYWNlO1xuICAgICQkJDEuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBDb2xsYXBzZTtcblxuICAgICQkJDEuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICQkJDEuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgICByZXR1cm4gQ29sbGFwc2UuX2pRdWVyeUludGVyZmFjZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIENvbGxhcHNlO1xuICB9KCQpO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBCb290c3RyYXAgKHY0LjEuMyk6IGRyb3Bkb3duLmpzXG4gICAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBEcm9wZG93biA9IGZ1bmN0aW9uICgkJCQxKSB7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogQ29uc3RhbnRzXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG4gICAgdmFyIE5BTUUgPSAnZHJvcGRvd24nO1xuICAgIHZhciBWRVJTSU9OID0gJzQuMS4zJztcbiAgICB2YXIgREFUQV9LRVkgPSAnYnMuZHJvcGRvd24nO1xuICAgIHZhciBFVkVOVF9LRVkgPSBcIi5cIiArIERBVEFfS0VZO1xuICAgIHZhciBEQVRBX0FQSV9LRVkgPSAnLmRhdGEtYXBpJztcbiAgICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJCQkMS5mbltOQU1FXTtcbiAgICB2YXIgRVNDQVBFX0tFWUNPREUgPSAyNzsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgRXNjYXBlIChFc2MpIGtleVxuXG4gICAgdmFyIFNQQUNFX0tFWUNPREUgPSAzMjsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3Igc3BhY2Uga2V5XG5cbiAgICB2YXIgVEFCX0tFWUNPREUgPSA5OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciB0YWIga2V5XG5cbiAgICB2YXIgQVJST1dfVVBfS0VZQ09ERSA9IDM4OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciB1cCBhcnJvdyBrZXlcblxuICAgIHZhciBBUlJPV19ET1dOX0tFWUNPREUgPSA0MDsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgZG93biBhcnJvdyBrZXlcblxuICAgIHZhciBSSUdIVF9NT1VTRV9CVVRUT05fV0hJQ0ggPSAzOyAvLyBNb3VzZUV2ZW50LndoaWNoIHZhbHVlIGZvciB0aGUgcmlnaHQgYnV0dG9uIChhc3N1bWluZyBhIHJpZ2h0LWhhbmRlZCBtb3VzZSlcblxuICAgIHZhciBSRUdFWFBfS0VZRE9XTiA9IG5ldyBSZWdFeHAoQVJST1dfVVBfS0VZQ09ERSArIFwifFwiICsgQVJST1dfRE9XTl9LRVlDT0RFICsgXCJ8XCIgKyBFU0NBUEVfS0VZQ09ERSk7XG4gICAgdmFyIEV2ZW50ID0ge1xuICAgICAgSElERTogXCJoaWRlXCIgKyBFVkVOVF9LRVksXG4gICAgICBISURERU46IFwiaGlkZGVuXCIgKyBFVkVOVF9LRVksXG4gICAgICBTSE9XOiBcInNob3dcIiArIEVWRU5UX0tFWSxcbiAgICAgIFNIT1dOOiBcInNob3duXCIgKyBFVkVOVF9LRVksXG4gICAgICBDTElDSzogXCJjbGlja1wiICsgRVZFTlRfS0VZLFxuICAgICAgQ0xJQ0tfREFUQV9BUEk6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWSxcbiAgICAgIEtFWURPV05fREFUQV9BUEk6IFwia2V5ZG93blwiICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZLFxuICAgICAgS0VZVVBfREFUQV9BUEk6IFwia2V5dXBcIiArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWVxuICAgIH07XG4gICAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICAgIERJU0FCTEVEOiAnZGlzYWJsZWQnLFxuICAgICAgU0hPVzogJ3Nob3cnLFxuICAgICAgRFJPUFVQOiAnZHJvcHVwJyxcbiAgICAgIERST1BSSUdIVDogJ2Ryb3ByaWdodCcsXG4gICAgICBEUk9QTEVGVDogJ2Ryb3BsZWZ0JyxcbiAgICAgIE1FTlVSSUdIVDogJ2Ryb3Bkb3duLW1lbnUtcmlnaHQnLFxuICAgICAgTUVOVUxFRlQ6ICdkcm9wZG93bi1tZW51LWxlZnQnLFxuICAgICAgUE9TSVRJT05fU1RBVElDOiAncG9zaXRpb24tc3RhdGljJ1xuICAgIH07XG4gICAgdmFyIFNlbGVjdG9yID0ge1xuICAgICAgREFUQV9UT0dHTEU6ICdbZGF0YS10b2dnbGU9XCJkcm9wZG93blwiXScsXG4gICAgICBGT1JNX0NISUxEOiAnLmRyb3Bkb3duIGZvcm0nLFxuICAgICAgTUVOVTogJy5kcm9wZG93bi1tZW51JyxcbiAgICAgIE5BVkJBUl9OQVY6ICcubmF2YmFyLW5hdicsXG4gICAgICBWSVNJQkxFX0lURU1TOiAnLmRyb3Bkb3duLW1lbnUgLmRyb3Bkb3duLWl0ZW06bm90KC5kaXNhYmxlZCk6bm90KDpkaXNhYmxlZCknXG4gICAgfTtcbiAgICB2YXIgQXR0YWNobWVudE1hcCA9IHtcbiAgICAgIFRPUDogJ3RvcC1zdGFydCcsXG4gICAgICBUT1BFTkQ6ICd0b3AtZW5kJyxcbiAgICAgIEJPVFRPTTogJ2JvdHRvbS1zdGFydCcsXG4gICAgICBCT1RUT01FTkQ6ICdib3R0b20tZW5kJyxcbiAgICAgIFJJR0hUOiAncmlnaHQtc3RhcnQnLFxuICAgICAgUklHSFRFTkQ6ICdyaWdodC1lbmQnLFxuICAgICAgTEVGVDogJ2xlZnQtc3RhcnQnLFxuICAgICAgTEVGVEVORDogJ2xlZnQtZW5kJ1xuICAgIH07XG4gICAgdmFyIERlZmF1bHQgPSB7XG4gICAgICBvZmZzZXQ6IDAsXG4gICAgICBmbGlwOiB0cnVlLFxuICAgICAgYm91bmRhcnk6ICdzY3JvbGxQYXJlbnQnLFxuICAgICAgcmVmZXJlbmNlOiAndG9nZ2xlJyxcbiAgICAgIGRpc3BsYXk6ICdkeW5hbWljJ1xuICAgIH07XG4gICAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgICAgb2Zmc2V0OiAnKG51bWJlcnxzdHJpbmd8ZnVuY3Rpb24pJyxcbiAgICAgIGZsaXA6ICdib29sZWFuJyxcbiAgICAgIGJvdW5kYXJ5OiAnKHN0cmluZ3xlbGVtZW50KScsXG4gICAgICByZWZlcmVuY2U6ICcoc3RyaW5nfGVsZW1lbnQpJyxcbiAgICAgIGRpc3BsYXk6ICdzdHJpbmcnXG4gICAgICAvKipcbiAgICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgKi9cblxuICAgIH07XG5cbiAgICB2YXIgRHJvcGRvd24gPVxuICAgIC8qI19fUFVSRV9fKi9cbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBmdW5jdGlvbiBEcm9wZG93bihlbGVtZW50LCBjb25maWcpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgIHRoaXMuX3BvcHBlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHRoaXMuX2dldENvbmZpZyhjb25maWcpO1xuICAgICAgICB0aGlzLl9tZW51ID0gdGhpcy5fZ2V0TWVudUVsZW1lbnQoKTtcbiAgICAgICAgdGhpcy5faW5OYXZiYXIgPSB0aGlzLl9kZXRlY3ROYXZiYXIoKTtcblxuICAgICAgICB0aGlzLl9hZGRFdmVudExpc3RlbmVycygpO1xuICAgICAgfSAvLyBHZXR0ZXJzXG5cblxuICAgICAgdmFyIF9wcm90byA9IERyb3Bkb3duLnByb3RvdHlwZTtcblxuICAgICAgLy8gUHVibGljXG4gICAgICBfcHJvdG8udG9nZ2xlID0gZnVuY3Rpb24gdG9nZ2xlKCkge1xuICAgICAgICBpZiAodGhpcy5fZWxlbWVudC5kaXNhYmxlZCB8fCAkJCQxKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5ESVNBQkxFRCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuXG4gICAgICAgIHZhciBpc0FjdGl2ZSA9ICQkJDEodGhpcy5fbWVudSkuaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICAgIERyb3Bkb3duLl9jbGVhck1lbnVzKCk7XG5cbiAgICAgICAgaWYgKGlzQWN0aXZlKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlbGF0ZWRUYXJnZXQgPSB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogdGhpcy5fZWxlbWVudFxuICAgICAgICB9O1xuICAgICAgICB2YXIgc2hvd0V2ZW50ID0gJCQkMS5FdmVudChFdmVudC5TSE9XLCByZWxhdGVkVGFyZ2V0KTtcbiAgICAgICAgJCQkMShwYXJlbnQpLnRyaWdnZXIoc2hvd0V2ZW50KTtcblxuICAgICAgICBpZiAoc2hvd0V2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IC8vIERpc2FibGUgdG90YWxseSBQb3BwZXIuanMgZm9yIERyb3Bkb3duIGluIE5hdmJhclxuXG5cbiAgICAgICAgaWYgKCF0aGlzLl9pbk5hdmJhcikge1xuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIENoZWNrIGZvciBQb3BwZXIgZGVwZW5kZW5jeVxuICAgICAgICAgICAqIFBvcHBlciAtIGh0dHBzOi8vcG9wcGVyLmpzLm9yZ1xuICAgICAgICAgICAqL1xuICAgICAgICAgIGlmICh0eXBlb2YgUG9wcGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9vdHN0cmFwIGRyb3Bkb3duIHJlcXVpcmUgUG9wcGVyLmpzIChodHRwczovL3BvcHBlci5qcy5vcmcpJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHJlZmVyZW5jZUVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuXG4gICAgICAgICAgaWYgKHRoaXMuX2NvbmZpZy5yZWZlcmVuY2UgPT09ICdwYXJlbnQnKSB7XG4gICAgICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gcGFyZW50O1xuICAgICAgICAgIH0gZWxzZSBpZiAoVXRpbC5pc0VsZW1lbnQodGhpcy5fY29uZmlnLnJlZmVyZW5jZSkpIHtcbiAgICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSB0aGlzLl9jb25maWcucmVmZXJlbmNlOyAvLyBDaGVjayBpZiBpdCdzIGpRdWVyeSBlbGVtZW50XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fY29uZmlnLnJlZmVyZW5jZS5qcXVlcnkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSB0aGlzLl9jb25maWcucmVmZXJlbmNlWzBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gLy8gSWYgYm91bmRhcnkgaXMgbm90IGBzY3JvbGxQYXJlbnRgLCB0aGVuIHNldCBwb3NpdGlvbiB0byBgc3RhdGljYFxuICAgICAgICAgIC8vIHRvIGFsbG93IHRoZSBtZW51IHRvIFwiZXNjYXBlXCIgdGhlIHNjcm9sbCBwYXJlbnQncyBib3VuZGFyaWVzXG4gICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2lzc3Vlcy8yNDI1MVxuXG5cbiAgICAgICAgICBpZiAodGhpcy5fY29uZmlnLmJvdW5kYXJ5ICE9PSAnc2Nyb2xsUGFyZW50Jykge1xuICAgICAgICAgICAgJCQkMShwYXJlbnQpLmFkZENsYXNzKENsYXNzTmFtZS5QT1NJVElPTl9TVEFUSUMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuX3BvcHBlciA9IG5ldyBQb3BwZXIocmVmZXJlbmNlRWxlbWVudCwgdGhpcy5fbWVudSwgdGhpcy5fZ2V0UG9wcGVyQ29uZmlnKCkpO1xuICAgICAgICB9IC8vIElmIHRoaXMgaXMgYSB0b3VjaC1lbmFibGVkIGRldmljZSB3ZSBhZGQgZXh0cmFcbiAgICAgICAgLy8gZW1wdHkgbW91c2VvdmVyIGxpc3RlbmVycyB0byB0aGUgYm9keSdzIGltbWVkaWF0ZSBjaGlsZHJlbjtcbiAgICAgICAgLy8gb25seSBuZWVkZWQgYmVjYXVzZSBvZiBicm9rZW4gZXZlbnQgZGVsZWdhdGlvbiBvbiBpT1NcbiAgICAgICAgLy8gaHR0cHM6Ly93d3cucXVpcmtzbW9kZS5vcmcvYmxvZy9hcmNoaXZlcy8yMDE0LzAyL21vdXNlX2V2ZW50X2J1Yi5odG1sXG5cblxuICAgICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICYmICQkJDEocGFyZW50KS5jbG9zZXN0KFNlbGVjdG9yLk5BVkJBUl9OQVYpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICQkJDEoZG9jdW1lbnQuYm9keSkuY2hpbGRyZW4oKS5vbignbW91c2VvdmVyJywgbnVsbCwgJCQkMS5ub29wKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuZm9jdXMoKTtcblxuICAgICAgICB0aGlzLl9lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsIHRydWUpO1xuXG4gICAgICAgICQkJDEodGhpcy5fbWVudSkudG9nZ2xlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuICAgICAgICAkJCQxKHBhcmVudCkudG9nZ2xlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpLnRyaWdnZXIoJCQkMS5FdmVudChFdmVudC5TSE9XTiwgcmVsYXRlZFRhcmdldCkpO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgICAkJCQxLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLm9mZihFVkVOVF9LRVkpO1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbWVudSA9IG51bGw7XG5cbiAgICAgICAgaWYgKHRoaXMuX3BvcHBlciAhPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuX3BvcHBlci5kZXN0cm95KCk7XG5cbiAgICAgICAgICB0aGlzLl9wb3BwZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8udXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgICB0aGlzLl9pbk5hdmJhciA9IHRoaXMuX2RldGVjdE5hdmJhcigpO1xuXG4gICAgICAgIGlmICh0aGlzLl9wb3BwZXIgIT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLl9wb3BwZXIuc2NoZWR1bGVVcGRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgfTsgLy8gUHJpdmF0ZVxuXG5cbiAgICAgIF9wcm90by5fYWRkRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbiBfYWRkRXZlbnRMaXN0ZW5lcnMoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgJCQkMSh0aGlzLl9lbGVtZW50KS5vbihFdmVudC5DTElDSywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgICAgIF90aGlzLnRvZ2dsZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgICAgY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgdGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0LCAkJCQxKHRoaXMuX2VsZW1lbnQpLmRhdGEoKSwgY29uZmlnKTtcbiAgICAgICAgVXRpbC50eXBlQ2hlY2tDb25maWcoTkFNRSwgY29uZmlnLCB0aGlzLmNvbnN0cnVjdG9yLkRlZmF1bHRUeXBlKTtcbiAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fZ2V0TWVudUVsZW1lbnQgPSBmdW5jdGlvbiBfZ2V0TWVudUVsZW1lbnQoKSB7XG4gICAgICAgIGlmICghdGhpcy5fbWVudSkge1xuICAgICAgICAgIHZhciBwYXJlbnQgPSBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG5cbiAgICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICB0aGlzLl9tZW51ID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IuTUVOVSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX21lbnU7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2dldFBsYWNlbWVudCA9IGZ1bmN0aW9uIF9nZXRQbGFjZW1lbnQoKSB7XG4gICAgICAgIHZhciAkcGFyZW50RHJvcGRvd24gPSAkJCQxKHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZSk7XG4gICAgICAgIHZhciBwbGFjZW1lbnQgPSBBdHRhY2htZW50TWFwLkJPVFRPTTsgLy8gSGFuZGxlIGRyb3B1cFxuXG4gICAgICAgIGlmICgkcGFyZW50RHJvcGRvd24uaGFzQ2xhc3MoQ2xhc3NOYW1lLkRST1BVUCkpIHtcbiAgICAgICAgICBwbGFjZW1lbnQgPSBBdHRhY2htZW50TWFwLlRPUDtcblxuICAgICAgICAgIGlmICgkJCQxKHRoaXMuX21lbnUpLmhhc0NsYXNzKENsYXNzTmFtZS5NRU5VUklHSFQpKSB7XG4gICAgICAgICAgICBwbGFjZW1lbnQgPSBBdHRhY2htZW50TWFwLlRPUEVORDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJHBhcmVudERyb3Bkb3duLmhhc0NsYXNzKENsYXNzTmFtZS5EUk9QUklHSFQpKSB7XG4gICAgICAgICAgcGxhY2VtZW50ID0gQXR0YWNobWVudE1hcC5SSUdIVDtcbiAgICAgICAgfSBlbHNlIGlmICgkcGFyZW50RHJvcGRvd24uaGFzQ2xhc3MoQ2xhc3NOYW1lLkRST1BMRUZUKSkge1xuICAgICAgICAgIHBsYWNlbWVudCA9IEF0dGFjaG1lbnRNYXAuTEVGVDtcbiAgICAgICAgfSBlbHNlIGlmICgkJCQxKHRoaXMuX21lbnUpLmhhc0NsYXNzKENsYXNzTmFtZS5NRU5VUklHSFQpKSB7XG4gICAgICAgICAgcGxhY2VtZW50ID0gQXR0YWNobWVudE1hcC5CT1RUT01FTkQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGxhY2VtZW50O1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9kZXRlY3ROYXZiYXIgPSBmdW5jdGlvbiBfZGV0ZWN0TmF2YmFyKCkge1xuICAgICAgICByZXR1cm4gJCQkMSh0aGlzLl9lbGVtZW50KS5jbG9zZXN0KCcubmF2YmFyJykubGVuZ3RoID4gMDtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fZ2V0UG9wcGVyQ29uZmlnID0gZnVuY3Rpb24gX2dldFBvcHBlckNvbmZpZygpIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIG9mZnNldENvbmYgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2NvbmZpZy5vZmZzZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBvZmZzZXRDb25mLmZuID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGRhdGEub2Zmc2V0cyA9IF9vYmplY3RTcHJlYWQoe30sIGRhdGEub2Zmc2V0cywgX3RoaXMyLl9jb25maWcub2Zmc2V0KGRhdGEub2Zmc2V0cykgfHwge30pO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvZmZzZXRDb25mLm9mZnNldCA9IHRoaXMuX2NvbmZpZy5vZmZzZXQ7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcG9wcGVyQ29uZmlnID0ge1xuICAgICAgICAgIHBsYWNlbWVudDogdGhpcy5fZ2V0UGxhY2VtZW50KCksXG4gICAgICAgICAgbW9kaWZpZXJzOiB7XG4gICAgICAgICAgICBvZmZzZXQ6IG9mZnNldENvbmYsXG4gICAgICAgICAgICBmbGlwOiB7XG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRoaXMuX2NvbmZpZy5mbGlwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJldmVudE92ZXJmbG93OiB7XG4gICAgICAgICAgICAgIGJvdW5kYXJpZXNFbGVtZW50OiB0aGlzLl9jb25maWcuYm91bmRhcnlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IC8vIERpc2FibGUgUG9wcGVyLmpzIGlmIHdlIGhhdmUgYSBzdGF0aWMgZGlzcGxheVxuXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMuX2NvbmZpZy5kaXNwbGF5ID09PSAnc3RhdGljJykge1xuICAgICAgICAgIHBvcHBlckNvbmZpZy5tb2RpZmllcnMuYXBwbHlTdHlsZSA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwb3BwZXJDb25maWc7XG4gICAgICB9OyAvLyBTdGF0aWNcblxuXG4gICAgICBEcm9wZG93bi5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSAkJCQxKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgICAgdmFyIF9jb25maWcgPSB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyA/IGNvbmZpZyA6IG51bGw7XG5cbiAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgIGRhdGEgPSBuZXcgRHJvcGRvd24odGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgICAkJCQxKHRoaXMpLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgRHJvcGRvd24uX2NsZWFyTWVudXMgPSBmdW5jdGlvbiBfY2xlYXJNZW51cyhldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQgJiYgKGV2ZW50LndoaWNoID09PSBSSUdIVF9NT1VTRV9CVVRUT05fV0hJQ0ggfHwgZXZlbnQudHlwZSA9PT0gJ2tleXVwJyAmJiBldmVudC53aGljaCAhPT0gVEFCX0tFWUNPREUpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRvZ2dsZXMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IuREFUQV9UT0dHTEUpKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdG9nZ2xlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIHZhciBwYXJlbnQgPSBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQodG9nZ2xlc1tpXSk7XG5cbiAgICAgICAgICB2YXIgY29udGV4dCA9ICQkJDEodG9nZ2xlc1tpXSkuZGF0YShEQVRBX0tFWSk7XG4gICAgICAgICAgdmFyIHJlbGF0ZWRUYXJnZXQgPSB7XG4gICAgICAgICAgICByZWxhdGVkVGFyZ2V0OiB0b2dnbGVzW2ldXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmIChldmVudCAmJiBldmVudC50eXBlID09PSAnY2xpY2snKSB7XG4gICAgICAgICAgICByZWxhdGVkVGFyZ2V0LmNsaWNrRXZlbnQgPSBldmVudDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBkcm9wZG93bk1lbnUgPSBjb250ZXh0Ll9tZW51O1xuXG4gICAgICAgICAgaWYgKCEkJCQxKHBhcmVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZXZlbnQgJiYgKGV2ZW50LnR5cGUgPT09ICdjbGljaycgJiYgL2lucHV0fHRleHRhcmVhL2kudGVzdChldmVudC50YXJnZXQudGFnTmFtZSkgfHwgZXZlbnQudHlwZSA9PT0gJ2tleXVwJyAmJiBldmVudC53aGljaCA9PT0gVEFCX0tFWUNPREUpICYmICQkJDEuY29udGFpbnMocGFyZW50LCBldmVudC50YXJnZXQpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgaGlkZUV2ZW50ID0gJCQkMS5FdmVudChFdmVudC5ISURFLCByZWxhdGVkVGFyZ2V0KTtcbiAgICAgICAgICAkJCQxKHBhcmVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuXG4gICAgICAgICAgaWYgKGhpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfSAvLyBJZiB0aGlzIGlzIGEgdG91Y2gtZW5hYmxlZCBkZXZpY2Ugd2UgcmVtb3ZlIHRoZSBleHRyYVxuICAgICAgICAgIC8vIGVtcHR5IG1vdXNlb3ZlciBsaXN0ZW5lcnMgd2UgYWRkZWQgZm9yIGlPUyBzdXBwb3J0XG5cblxuICAgICAgICAgIGlmICgnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpIHtcbiAgICAgICAgICAgICQkJDEoZG9jdW1lbnQuYm9keSkuY2hpbGRyZW4oKS5vZmYoJ21vdXNlb3ZlcicsIG51bGwsICQkJDEubm9vcCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdG9nZ2xlc1tpXS5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnKTtcbiAgICAgICAgICAkJCQxKGRyb3Bkb3duTWVudSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuICAgICAgICAgICQkJDEocGFyZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVykudHJpZ2dlcigkJCQxLkV2ZW50KEV2ZW50LkhJRERFTiwgcmVsYXRlZFRhcmdldCkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQgPSBmdW5jdGlvbiBfZ2V0UGFyZW50RnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICB2YXIgcGFyZW50O1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgcGFyZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGFyZW50IHx8IGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgIH07IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb21wbGV4aXR5XG5cblxuICAgICAgRHJvcGRvd24uX2RhdGFBcGlLZXlkb3duSGFuZGxlciA9IGZ1bmN0aW9uIF9kYXRhQXBpS2V5ZG93bkhhbmRsZXIoZXZlbnQpIHtcbiAgICAgICAgLy8gSWYgbm90IGlucHV0L3RleHRhcmVhOlxuICAgICAgICAvLyAgLSBBbmQgbm90IGEga2V5IGluIFJFR0VYUF9LRVlET1dOID0+IG5vdCBhIGRyb3Bkb3duIGNvbW1hbmRcbiAgICAgICAgLy8gSWYgaW5wdXQvdGV4dGFyZWE6XG4gICAgICAgIC8vICAtIElmIHNwYWNlIGtleSA9PiBub3QgYSBkcm9wZG93biBjb21tYW5kXG4gICAgICAgIC8vICAtIElmIGtleSBpcyBvdGhlciB0aGFuIGVzY2FwZVxuICAgICAgICAvLyAgICAtIElmIGtleSBpcyBub3QgdXAgb3IgZG93biA9PiBub3QgYSBkcm9wZG93biBjb21tYW5kXG4gICAgICAgIC8vICAgIC0gSWYgdHJpZ2dlciBpbnNpZGUgdGhlIG1lbnUgPT4gbm90IGEgZHJvcGRvd24gY29tbWFuZFxuICAgICAgICBpZiAoL2lucHV0fHRleHRhcmVhL2kudGVzdChldmVudC50YXJnZXQudGFnTmFtZSkgPyBldmVudC53aGljaCA9PT0gU1BBQ0VfS0VZQ09ERSB8fCBldmVudC53aGljaCAhPT0gRVNDQVBFX0tFWUNPREUgJiYgKGV2ZW50LndoaWNoICE9PSBBUlJPV19ET1dOX0tFWUNPREUgJiYgZXZlbnQud2hpY2ggIT09IEFSUk9XX1VQX0tFWUNPREUgfHwgJCQkMShldmVudC50YXJnZXQpLmNsb3Nlc3QoU2VsZWN0b3IuTUVOVSkubGVuZ3RoKSA6ICFSRUdFWFBfS0VZRE9XTi50ZXN0KGV2ZW50LndoaWNoKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgIGlmICh0aGlzLmRpc2FibGVkIHx8ICQkJDEodGhpcykuaGFzQ2xhc3MoQ2xhc3NOYW1lLkRJU0FCTEVEKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwYXJlbnQgPSBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQodGhpcyk7XG5cbiAgICAgICAgdmFyIGlzQWN0aXZlID0gJCQkMShwYXJlbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgICBpZiAoIWlzQWN0aXZlICYmIChldmVudC53aGljaCAhPT0gRVNDQVBFX0tFWUNPREUgfHwgZXZlbnQud2hpY2ggIT09IFNQQUNFX0tFWUNPREUpIHx8IGlzQWN0aXZlICYmIChldmVudC53aGljaCA9PT0gRVNDQVBFX0tFWUNPREUgfHwgZXZlbnQud2hpY2ggPT09IFNQQUNFX0tFWUNPREUpKSB7XG4gICAgICAgICAgaWYgKGV2ZW50LndoaWNoID09PSBFU0NBUEVfS0VZQ09ERSkge1xuICAgICAgICAgICAgdmFyIHRvZ2dsZSA9IHBhcmVudC5xdWVyeVNlbGVjdG9yKFNlbGVjdG9yLkRBVEFfVE9HR0xFKTtcbiAgICAgICAgICAgICQkJDEodG9nZ2xlKS50cmlnZ2VyKCdmb2N1cycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICQkJDEodGhpcykudHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaXRlbXMgPSBbXS5zbGljZS5jYWxsKHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yLlZJU0lCTEVfSVRFTVMpKTtcblxuICAgICAgICBpZiAoaXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGluZGV4ID0gaXRlbXMuaW5kZXhPZihldmVudC50YXJnZXQpO1xuXG4gICAgICAgIGlmIChldmVudC53aGljaCA9PT0gQVJST1dfVVBfS0VZQ09ERSAmJiBpbmRleCA+IDApIHtcbiAgICAgICAgICAvLyBVcFxuICAgICAgICAgIGluZGV4LS07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXZlbnQud2hpY2ggPT09IEFSUk9XX0RPV05fS0VZQ09ERSAmJiBpbmRleCA8IGl0ZW1zLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAvLyBEb3duXG4gICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBpdGVtc1tpbmRleF0uZm9jdXMoKTtcbiAgICAgIH07XG5cbiAgICAgIF9jcmVhdGVDbGFzcyhEcm9wZG93biwgbnVsbCwgW3tcbiAgICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcIkRlZmF1bHRUeXBlXCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBEZWZhdWx0VHlwZTtcbiAgICAgICAgfVxuICAgICAgfV0pO1xuXG4gICAgICByZXR1cm4gRHJvcGRvd247XG4gICAgfSgpO1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cblxuICAgICQkJDEoZG9jdW1lbnQpLm9uKEV2ZW50LktFWURPV05fREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfVE9HR0xFLCBEcm9wZG93bi5fZGF0YUFwaUtleWRvd25IYW5kbGVyKS5vbihFdmVudC5LRVlET1dOX0RBVEFfQVBJLCBTZWxlY3Rvci5NRU5VLCBEcm9wZG93bi5fZGF0YUFwaUtleWRvd25IYW5kbGVyKS5vbihFdmVudC5DTElDS19EQVRBX0FQSSArIFwiIFwiICsgRXZlbnQuS0VZVVBfREFUQV9BUEksIERyb3Bkb3duLl9jbGVhck1lbnVzKS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9UT0dHTEUsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICBEcm9wZG93bi5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJCQkMSh0aGlzKSwgJ3RvZ2dsZScpO1xuICAgIH0pLm9uKEV2ZW50LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3Rvci5GT1JNX0NISUxELCBmdW5jdGlvbiAoZSkge1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9KTtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBqUXVlcnlcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICAgICQkJDEuZm5bTkFNRV0gPSBEcm9wZG93bi5falF1ZXJ5SW50ZXJmYWNlO1xuICAgICQkJDEuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBEcm9wZG93bjtcblxuICAgICQkJDEuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICQkJDEuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgICByZXR1cm4gRHJvcGRvd24uX2pRdWVyeUludGVyZmFjZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERyb3Bkb3duO1xuICB9KCQsIFBvcHBlcik7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIEJvb3RzdHJhcCAodjQuMS4zKTogbW9kYWwuanNcbiAgICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvYmxvYi9tYXN0ZXIvTElDRU5TRSlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE1vZGFsID0gZnVuY3Rpb24gKCQkJDEpIHtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDb25zdGFudHNcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cbiAgICB2YXIgTkFNRSA9ICdtb2RhbCc7XG4gICAgdmFyIFZFUlNJT04gPSAnNC4xLjMnO1xuICAgIHZhciBEQVRBX0tFWSA9ICdicy5tb2RhbCc7XG4gICAgdmFyIEVWRU5UX0tFWSA9IFwiLlwiICsgREFUQV9LRVk7XG4gICAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICAgIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkJCQxLmZuW05BTUVdO1xuICAgIHZhciBFU0NBUEVfS0VZQ09ERSA9IDI3OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciBFc2NhcGUgKEVzYykga2V5XG5cbiAgICB2YXIgRGVmYXVsdCA9IHtcbiAgICAgIGJhY2tkcm9wOiB0cnVlLFxuICAgICAga2V5Ym9hcmQ6IHRydWUsXG4gICAgICBmb2N1czogdHJ1ZSxcbiAgICAgIHNob3c6IHRydWVcbiAgICB9O1xuICAgIHZhciBEZWZhdWx0VHlwZSA9IHtcbiAgICAgIGJhY2tkcm9wOiAnKGJvb2xlYW58c3RyaW5nKScsXG4gICAgICBrZXlib2FyZDogJ2Jvb2xlYW4nLFxuICAgICAgZm9jdXM6ICdib29sZWFuJyxcbiAgICAgIHNob3c6ICdib29sZWFuJ1xuICAgIH07XG4gICAgdmFyIEV2ZW50ID0ge1xuICAgICAgSElERTogXCJoaWRlXCIgKyBFVkVOVF9LRVksXG4gICAgICBISURERU46IFwiaGlkZGVuXCIgKyBFVkVOVF9LRVksXG4gICAgICBTSE9XOiBcInNob3dcIiArIEVWRU5UX0tFWSxcbiAgICAgIFNIT1dOOiBcInNob3duXCIgKyBFVkVOVF9LRVksXG4gICAgICBGT0NVU0lOOiBcImZvY3VzaW5cIiArIEVWRU5UX0tFWSxcbiAgICAgIFJFU0laRTogXCJyZXNpemVcIiArIEVWRU5UX0tFWSxcbiAgICAgIENMSUNLX0RJU01JU1M6IFwiY2xpY2suZGlzbWlzc1wiICsgRVZFTlRfS0VZLFxuICAgICAgS0VZRE9XTl9ESVNNSVNTOiBcImtleWRvd24uZGlzbWlzc1wiICsgRVZFTlRfS0VZLFxuICAgICAgTU9VU0VVUF9ESVNNSVNTOiBcIm1vdXNldXAuZGlzbWlzc1wiICsgRVZFTlRfS0VZLFxuICAgICAgTU9VU0VET1dOX0RJU01JU1M6IFwibW91c2Vkb3duLmRpc21pc3NcIiArIEVWRU5UX0tFWSxcbiAgICAgIENMSUNLX0RBVEFfQVBJOiBcImNsaWNrXCIgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVlcbiAgICB9O1xuICAgIHZhciBDbGFzc05hbWUgPSB7XG4gICAgICBTQ1JPTExCQVJfTUVBU1VSRVI6ICdtb2RhbC1zY3JvbGxiYXItbWVhc3VyZScsXG4gICAgICBCQUNLRFJPUDogJ21vZGFsLWJhY2tkcm9wJyxcbiAgICAgIE9QRU46ICdtb2RhbC1vcGVuJyxcbiAgICAgIEZBREU6ICdmYWRlJyxcbiAgICAgIFNIT1c6ICdzaG93J1xuICAgIH07XG4gICAgdmFyIFNlbGVjdG9yID0ge1xuICAgICAgRElBTE9HOiAnLm1vZGFsLWRpYWxvZycsXG4gICAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cIm1vZGFsXCJdJyxcbiAgICAgIERBVEFfRElTTUlTUzogJ1tkYXRhLWRpc21pc3M9XCJtb2RhbFwiXScsXG4gICAgICBGSVhFRF9DT05URU5UOiAnLmZpeGVkLXRvcCwgLmZpeGVkLWJvdHRvbSwgLmlzLWZpeGVkLCAuc3RpY2t5LXRvcCcsXG4gICAgICBTVElDS1lfQ09OVEVOVDogJy5zdGlja3ktdG9wJ1xuICAgICAgLyoqXG4gICAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAqIENsYXNzIERlZmluaXRpb25cbiAgICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICovXG5cbiAgICB9O1xuXG4gICAgdmFyIE1vZGFsID1cbiAgICAvKiNfX1BVUkVfXyovXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgZnVuY3Rpb24gTW9kYWwoZWxlbWVudCwgY29uZmlnKSB7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHRoaXMuX2dldENvbmZpZyhjb25maWcpO1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgdGhpcy5fZGlhbG9nID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFNlbGVjdG9yLkRJQUxPRyk7XG4gICAgICAgIHRoaXMuX2JhY2tkcm9wID0gbnVsbDtcbiAgICAgICAgdGhpcy5faXNTaG93biA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9pZ25vcmVCYWNrZHJvcENsaWNrID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3Njcm9sbGJhcldpZHRoID0gMDtcbiAgICAgIH0gLy8gR2V0dGVyc1xuXG5cbiAgICAgIHZhciBfcHJvdG8gPSBNb2RhbC5wcm90b3R5cGU7XG5cbiAgICAgIC8vIFB1YmxpY1xuICAgICAgX3Byb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZShyZWxhdGVkVGFyZ2V0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pc1Nob3duID8gdGhpcy5oaWRlKCkgOiB0aGlzLnNob3cocmVsYXRlZFRhcmdldCk7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uc2hvdyA9IGZ1bmN0aW9uIHNob3cocmVsYXRlZFRhcmdldCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIGlmICh0aGlzLl9pc1RyYW5zaXRpb25pbmcgfHwgdGhpcy5faXNTaG93bikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkJCQxKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5GQURFKSkge1xuICAgICAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2hvd0V2ZW50ID0gJCQkMS5FdmVudChFdmVudC5TSE9XLCB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogcmVsYXRlZFRhcmdldFxuICAgICAgICB9KTtcbiAgICAgICAgJCQkMSh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNob3dFdmVudCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2lzU2hvd24gfHwgc2hvd0V2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faXNTaG93biA9IHRydWU7XG5cbiAgICAgICAgdGhpcy5fY2hlY2tTY3JvbGxiYXIoKTtcblxuICAgICAgICB0aGlzLl9zZXRTY3JvbGxiYXIoKTtcblxuICAgICAgICB0aGlzLl9hZGp1c3REaWFsb2coKTtcblxuICAgICAgICAkJCQxKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKENsYXNzTmFtZS5PUEVOKTtcblxuICAgICAgICB0aGlzLl9zZXRFc2NhcGVFdmVudCgpO1xuXG4gICAgICAgIHRoaXMuX3NldFJlc2l6ZUV2ZW50KCk7XG5cbiAgICAgICAgJCQkMSh0aGlzLl9lbGVtZW50KS5vbihFdmVudC5DTElDS19ESVNNSVNTLCBTZWxlY3Rvci5EQVRBX0RJU01JU1MsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpcy5oaWRlKGV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgICAgICQkJDEodGhpcy5fZGlhbG9nKS5vbihFdmVudC5NT1VTRURPV05fRElTTUlTUywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQkJDEoX3RoaXMuX2VsZW1lbnQpLm9uZShFdmVudC5NT1VTRVVQX0RJU01JU1MsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgaWYgKCQkJDEoZXZlbnQudGFyZ2V0KS5pcyhfdGhpcy5fZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgX3RoaXMuX2lnbm9yZUJhY2tkcm9wQ2xpY2sgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zaG93QmFja2Ryb3AoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBfdGhpcy5fc2hvd0VsZW1lbnQocmVsYXRlZFRhcmdldCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmhpZGUgPSBmdW5jdGlvbiBoaWRlKGV2ZW50KSB7XG4gICAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5faXNUcmFuc2l0aW9uaW5nIHx8ICF0aGlzLl9pc1Nob3duKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGhpZGVFdmVudCA9ICQkJDEuRXZlbnQoRXZlbnQuSElERSk7XG4gICAgICAgICQkJDEodGhpcy5fZWxlbWVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuXG4gICAgICAgIGlmICghdGhpcy5faXNTaG93biB8fCBoaWRlRXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9pc1Nob3duID0gZmFsc2U7XG4gICAgICAgIHZhciB0cmFuc2l0aW9uID0gJCQkMSh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSk7XG5cbiAgICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2V0RXNjYXBlRXZlbnQoKTtcblxuICAgICAgICB0aGlzLl9zZXRSZXNpemVFdmVudCgpO1xuXG4gICAgICAgICQkJDEoZG9jdW1lbnQpLm9mZihFdmVudC5GT0NVU0lOKTtcbiAgICAgICAgJCQkMSh0aGlzLl9lbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG4gICAgICAgICQkJDEodGhpcy5fZWxlbWVudCkub2ZmKEV2ZW50LkNMSUNLX0RJU01JU1MpO1xuICAgICAgICAkJCQxKHRoaXMuX2RpYWxvZykub2ZmKEV2ZW50Lk1PVVNFRE9XTl9ESVNNSVNTKTtcblxuICAgICAgICBpZiAodHJhbnNpdGlvbikge1xuICAgICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgICAgICQkJDEodGhpcy5fZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzMi5faGlkZU1vZGFsKGV2ZW50KTtcbiAgICAgICAgICB9KS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2hpZGVNb2RhbCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAgICQkJDEucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSk7XG4gICAgICAgICQkJDEod2luZG93LCBkb2N1bWVudCwgdGhpcy5fZWxlbWVudCwgdGhpcy5fYmFja2Ryb3ApLm9mZihFVkVOVF9LRVkpO1xuICAgICAgICB0aGlzLl9jb25maWcgPSBudWxsO1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZGlhbG9nID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYmFja2Ryb3AgPSBudWxsO1xuICAgICAgICB0aGlzLl9pc1Nob3duID0gbnVsbDtcbiAgICAgICAgdGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgPSBudWxsO1xuICAgICAgICB0aGlzLl9pZ25vcmVCYWNrZHJvcENsaWNrID0gbnVsbDtcbiAgICAgICAgdGhpcy5fc2Nyb2xsYmFyV2lkdGggPSBudWxsO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmhhbmRsZVVwZGF0ZSA9IGZ1bmN0aW9uIGhhbmRsZVVwZGF0ZSgpIHtcbiAgICAgICAgdGhpcy5fYWRqdXN0RGlhbG9nKCk7XG4gICAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgICAgX3Byb3RvLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgICBjb25maWcgPSBfb2JqZWN0U3ByZWFkKHt9LCBEZWZhdWx0LCBjb25maWcpO1xuICAgICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FLCBjb25maWcsIERlZmF1bHRUeXBlKTtcbiAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fc2hvd0VsZW1lbnQgPSBmdW5jdGlvbiBfc2hvd0VsZW1lbnQocmVsYXRlZFRhcmdldCkge1xuICAgICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgICB2YXIgdHJhbnNpdGlvbiA9ICQkJDEodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpO1xuXG4gICAgICAgIGlmICghdGhpcy5fZWxlbWVudC5wYXJlbnROb2RlIHx8IHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZS5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAvLyBEb24ndCBtb3ZlIG1vZGFsJ3MgRE9NIHBvc2l0aW9uXG4gICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLl9lbGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cbiAgICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJyk7XG5cbiAgICAgICAgdGhpcy5fZWxlbWVudC5zY3JvbGxUb3AgPSAwO1xuXG4gICAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICAgVXRpbC5yZWZsb3codGhpcy5fZWxlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgICBpZiAodGhpcy5fY29uZmlnLmZvY3VzKSB7XG4gICAgICAgICAgdGhpcy5fZW5mb3JjZUZvY3VzKCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2hvd25FdmVudCA9ICQkJDEuRXZlbnQoRXZlbnQuU0hPV04sIHtcbiAgICAgICAgICByZWxhdGVkVGFyZ2V0OiByZWxhdGVkVGFyZ2V0XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciB0cmFuc2l0aW9uQ29tcGxldGUgPSBmdW5jdGlvbiB0cmFuc2l0aW9uQ29tcGxldGUoKSB7XG4gICAgICAgICAgaWYgKF90aGlzMy5fY29uZmlnLmZvY3VzKSB7XG4gICAgICAgICAgICBfdGhpczMuX2VsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBfdGhpczMuX2lzVHJhbnNpdGlvbmluZyA9IGZhbHNlO1xuICAgICAgICAgICQkJDEoX3RoaXMzLl9lbGVtZW50KS50cmlnZ2VyKHNob3duRXZlbnQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG4gICAgICAgICAgJCQkMSh0aGlzLl9kaWFsb2cpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCB0cmFuc2l0aW9uQ29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJhbnNpdGlvbkNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fZW5mb3JjZUZvY3VzID0gZnVuY3Rpb24gX2VuZm9yY2VGb2N1cygpIHtcbiAgICAgICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICAgICAgJCQkMShkb2N1bWVudCkub2ZmKEV2ZW50LkZPQ1VTSU4pIC8vIEd1YXJkIGFnYWluc3QgaW5maW5pdGUgZm9jdXMgbG9vcFxuICAgICAgICAub24oRXZlbnQuRk9DVVNJTiwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGRvY3VtZW50ICE9PSBldmVudC50YXJnZXQgJiYgX3RoaXM0Ll9lbGVtZW50ICE9PSBldmVudC50YXJnZXQgJiYgJCQkMShfdGhpczQuX2VsZW1lbnQpLmhhcyhldmVudC50YXJnZXQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgX3RoaXM0Ll9lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fc2V0RXNjYXBlRXZlbnQgPSBmdW5jdGlvbiBfc2V0RXNjYXBlRXZlbnQoKSB7XG4gICAgICAgIHZhciBfdGhpczUgPSB0aGlzO1xuXG4gICAgICAgIGlmICh0aGlzLl9pc1Nob3duICYmIHRoaXMuX2NvbmZpZy5rZXlib2FyZCkge1xuICAgICAgICAgICQkJDEodGhpcy5fZWxlbWVudCkub24oRXZlbnQuS0VZRE9XTl9ESVNNSVNTLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC53aGljaCA9PT0gRVNDQVBFX0tFWUNPREUpIHtcbiAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgICBfdGhpczUuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLl9pc1Nob3duKSB7XG4gICAgICAgICAgJCQkMSh0aGlzLl9lbGVtZW50KS5vZmYoRXZlbnQuS0VZRE9XTl9ESVNNSVNTKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9zZXRSZXNpemVFdmVudCA9IGZ1bmN0aW9uIF9zZXRSZXNpemVFdmVudCgpIHtcbiAgICAgICAgdmFyIF90aGlzNiA9IHRoaXM7XG5cbiAgICAgICAgaWYgKHRoaXMuX2lzU2hvd24pIHtcbiAgICAgICAgICAkJCQxKHdpbmRvdykub24oRXZlbnQuUkVTSVpFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczYuaGFuZGxlVXBkYXRlKGV2ZW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkJCQxKHdpbmRvdykub2ZmKEV2ZW50LlJFU0laRSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5faGlkZU1vZGFsID0gZnVuY3Rpb24gX2hpZGVNb2RhbCgpIHtcbiAgICAgICAgdmFyIF90aGlzNyA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuXG4gICAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuX3Nob3dCYWNrZHJvcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJCQkMShkb2N1bWVudC5ib2R5KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuT1BFTik7XG5cbiAgICAgICAgICBfdGhpczcuX3Jlc2V0QWRqdXN0bWVudHMoKTtcblxuICAgICAgICAgIF90aGlzNy5fcmVzZXRTY3JvbGxiYXIoKTtcblxuICAgICAgICAgICQkJDEoX3RoaXM3Ll9lbGVtZW50KS50cmlnZ2VyKEV2ZW50LkhJRERFTik7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9yZW1vdmVCYWNrZHJvcCA9IGZ1bmN0aW9uIF9yZW1vdmVCYWNrZHJvcCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2JhY2tkcm9wKSB7XG4gICAgICAgICAgJCQkMSh0aGlzLl9iYWNrZHJvcCkucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5fYmFja2Ryb3AgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX3Nob3dCYWNrZHJvcCA9IGZ1bmN0aW9uIF9zaG93QmFja2Ryb3AoY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIF90aGlzOCA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGFuaW1hdGUgPSAkJCQxKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5GQURFKSA/IENsYXNzTmFtZS5GQURFIDogJyc7XG5cbiAgICAgICAgaWYgKHRoaXMuX2lzU2hvd24gJiYgdGhpcy5fY29uZmlnLmJhY2tkcm9wKSB7XG4gICAgICAgICAgdGhpcy5fYmFja2Ryb3AgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICB0aGlzLl9iYWNrZHJvcC5jbGFzc05hbWUgPSBDbGFzc05hbWUuQkFDS0RST1A7XG5cbiAgICAgICAgICBpZiAoYW5pbWF0ZSkge1xuICAgICAgICAgICAgdGhpcy5fYmFja2Ryb3AuY2xhc3NMaXN0LmFkZChhbmltYXRlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkJCQxKHRoaXMuX2JhY2tkcm9wKS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KTtcbiAgICAgICAgICAkJCQxKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50LkNMSUNLX0RJU01JU1MsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgaWYgKF90aGlzOC5faWdub3JlQmFja2Ryb3BDbGljaykge1xuICAgICAgICAgICAgICBfdGhpczguX2lnbm9yZUJhY2tkcm9wQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0ICE9PSBldmVudC5jdXJyZW50VGFyZ2V0KSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKF90aGlzOC5fY29uZmlnLmJhY2tkcm9wID09PSAnc3RhdGljJykge1xuICAgICAgICAgICAgICBfdGhpczguX2VsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF90aGlzOC5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoYW5pbWF0ZSkge1xuICAgICAgICAgICAgVXRpbC5yZWZsb3codGhpcy5fYmFja2Ryb3ApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICQkJDEodGhpcy5fYmFja2Ryb3ApLmFkZENsYXNzKENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWFuaW1hdGUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGJhY2tkcm9wVHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudCh0aGlzLl9iYWNrZHJvcCk7XG4gICAgICAgICAgJCQkMSh0aGlzLl9iYWNrZHJvcCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNhbGxiYWNrKS5lbXVsYXRlVHJhbnNpdGlvbkVuZChiYWNrZHJvcFRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzU2hvd24gJiYgdGhpcy5fYmFja2Ryb3ApIHtcbiAgICAgICAgICAkJCQxKHRoaXMuX2JhY2tkcm9wKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgICAgICB2YXIgY2FsbGJhY2tSZW1vdmUgPSBmdW5jdGlvbiBjYWxsYmFja1JlbW92ZSgpIHtcbiAgICAgICAgICAgIF90aGlzOC5fcmVtb3ZlQmFja2Ryb3AoKTtcblxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmICgkJCQxKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5GQURFKSkge1xuICAgICAgICAgICAgdmFyIF9iYWNrZHJvcFRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQodGhpcy5fYmFja2Ryb3ApO1xuXG4gICAgICAgICAgICAkJCQxKHRoaXMuX2JhY2tkcm9wKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY2FsbGJhY2tSZW1vdmUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKF9iYWNrZHJvcFRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrUmVtb3ZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgfTsgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gdGhlIGZvbGxvd2luZyBtZXRob2RzIGFyZSB1c2VkIHRvIGhhbmRsZSBvdmVyZmxvd2luZyBtb2RhbHNcbiAgICAgIC8vIHRvZG8gKGZhdCk6IHRoZXNlIHNob3VsZCBwcm9iYWJseSBiZSByZWZhY3RvcmVkIG91dCBvZiBtb2RhbC5qc1xuICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiAgICAgIF9wcm90by5fYWRqdXN0RGlhbG9nID0gZnVuY3Rpb24gX2FkanVzdERpYWxvZygpIHtcbiAgICAgICAgdmFyIGlzTW9kYWxPdmVyZmxvd2luZyA9IHRoaXMuX2VsZW1lbnQuc2Nyb2xsSGVpZ2h0ID4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodDtcblxuICAgICAgICBpZiAoIXRoaXMuX2lzQm9keU92ZXJmbG93aW5nICYmIGlzTW9kYWxPdmVyZmxvd2luZykge1xuICAgICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUucGFkZGluZ0xlZnQgPSB0aGlzLl9zY3JvbGxiYXJXaWR0aCArIFwicHhcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyAmJiAhaXNNb2RhbE92ZXJmbG93aW5nKSB7XG4gICAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5wYWRkaW5nUmlnaHQgPSB0aGlzLl9zY3JvbGxiYXJXaWR0aCArIFwicHhcIjtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9yZXNldEFkanVzdG1lbnRzID0gZnVuY3Rpb24gX3Jlc2V0QWRqdXN0bWVudHMoKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUucGFkZGluZ0xlZnQgPSAnJztcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5wYWRkaW5nUmlnaHQgPSAnJztcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fY2hlY2tTY3JvbGxiYXIgPSBmdW5jdGlvbiBfY2hlY2tTY3JvbGxiYXIoKSB7XG4gICAgICAgIHZhciByZWN0ID0gZG9jdW1lbnQuYm9keS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgPSByZWN0LmxlZnQgKyByZWN0LnJpZ2h0IDwgd2luZG93LmlubmVyV2lkdGg7XG4gICAgICAgIHRoaXMuX3Njcm9sbGJhcldpZHRoID0gdGhpcy5fZ2V0U2Nyb2xsYmFyV2lkdGgoKTtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fc2V0U2Nyb2xsYmFyID0gZnVuY3Rpb24gX3NldFNjcm9sbGJhcigpIHtcbiAgICAgICAgdmFyIF90aGlzOSA9IHRoaXM7XG5cbiAgICAgICAgaWYgKHRoaXMuX2lzQm9keU92ZXJmbG93aW5nKSB7XG4gICAgICAgICAgLy8gTm90ZTogRE9NTm9kZS5zdHlsZS5wYWRkaW5nUmlnaHQgcmV0dXJucyB0aGUgYWN0dWFsIHZhbHVlIG9yICcnIGlmIG5vdCBzZXRcbiAgICAgICAgICAvLyAgIHdoaWxlICQoRE9NTm9kZSkuY3NzKCdwYWRkaW5nLXJpZ2h0JykgcmV0dXJucyB0aGUgY2FsY3VsYXRlZCB2YWx1ZSBvciAwIGlmIG5vdCBzZXRcbiAgICAgICAgICB2YXIgZml4ZWRDb250ZW50ID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yLkZJWEVEX0NPTlRFTlQpKTtcbiAgICAgICAgICB2YXIgc3RpY2t5Q29udGVudCA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3Rvci5TVElDS1lfQ09OVEVOVCkpOyAvLyBBZGp1c3QgZml4ZWQgY29udGVudCBwYWRkaW5nXG5cbiAgICAgICAgICAkJCQxKGZpeGVkQ29udGVudCkuZWFjaChmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciBhY3R1YWxQYWRkaW5nID0gZWxlbWVudC5zdHlsZS5wYWRkaW5nUmlnaHQ7XG4gICAgICAgICAgICB2YXIgY2FsY3VsYXRlZFBhZGRpbmcgPSAkJCQxKGVsZW1lbnQpLmNzcygncGFkZGluZy1yaWdodCcpO1xuICAgICAgICAgICAgJCQkMShlbGVtZW50KS5kYXRhKCdwYWRkaW5nLXJpZ2h0JywgYWN0dWFsUGFkZGluZykuY3NzKCdwYWRkaW5nLXJpZ2h0JywgcGFyc2VGbG9hdChjYWxjdWxhdGVkUGFkZGluZykgKyBfdGhpczkuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiKTtcbiAgICAgICAgICB9KTsgLy8gQWRqdXN0IHN0aWNreSBjb250ZW50IG1hcmdpblxuXG4gICAgICAgICAgJCQkMShzdGlja3lDb250ZW50KS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgdmFyIGFjdHVhbE1hcmdpbiA9IGVsZW1lbnQuc3R5bGUubWFyZ2luUmlnaHQ7XG4gICAgICAgICAgICB2YXIgY2FsY3VsYXRlZE1hcmdpbiA9ICQkJDEoZWxlbWVudCkuY3NzKCdtYXJnaW4tcmlnaHQnKTtcbiAgICAgICAgICAgICQkJDEoZWxlbWVudCkuZGF0YSgnbWFyZ2luLXJpZ2h0JywgYWN0dWFsTWFyZ2luKS5jc3MoJ21hcmdpbi1yaWdodCcsIHBhcnNlRmxvYXQoY2FsY3VsYXRlZE1hcmdpbikgLSBfdGhpczkuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiKTtcbiAgICAgICAgICB9KTsgLy8gQWRqdXN0IGJvZHkgcGFkZGluZ1xuXG4gICAgICAgICAgdmFyIGFjdHVhbFBhZGRpbmcgPSBkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodDtcbiAgICAgICAgICB2YXIgY2FsY3VsYXRlZFBhZGRpbmcgPSAkJCQxKGRvY3VtZW50LmJvZHkpLmNzcygncGFkZGluZy1yaWdodCcpO1xuICAgICAgICAgICQkJDEoZG9jdW1lbnQuYm9keSkuZGF0YSgncGFkZGluZy1yaWdodCcsIGFjdHVhbFBhZGRpbmcpLmNzcygncGFkZGluZy1yaWdodCcsIHBhcnNlRmxvYXQoY2FsY3VsYXRlZFBhZGRpbmcpICsgdGhpcy5fc2Nyb2xsYmFyV2lkdGggKyBcInB4XCIpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX3Jlc2V0U2Nyb2xsYmFyID0gZnVuY3Rpb24gX3Jlc2V0U2Nyb2xsYmFyKCkge1xuICAgICAgICAvLyBSZXN0b3JlIGZpeGVkIGNvbnRlbnQgcGFkZGluZ1xuICAgICAgICB2YXIgZml4ZWRDb250ZW50ID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yLkZJWEVEX0NPTlRFTlQpKTtcbiAgICAgICAgJCQkMShmaXhlZENvbnRlbnQpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgICAgdmFyIHBhZGRpbmcgPSAkJCQxKGVsZW1lbnQpLmRhdGEoJ3BhZGRpbmctcmlnaHQnKTtcbiAgICAgICAgICAkJCQxKGVsZW1lbnQpLnJlbW92ZURhdGEoJ3BhZGRpbmctcmlnaHQnKTtcbiAgICAgICAgICBlbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodCA9IHBhZGRpbmcgPyBwYWRkaW5nIDogJyc7XG4gICAgICAgIH0pOyAvLyBSZXN0b3JlIHN0aWNreSBjb250ZW50XG5cbiAgICAgICAgdmFyIGVsZW1lbnRzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiXCIgKyBTZWxlY3Rvci5TVElDS1lfQ09OVEVOVCkpO1xuICAgICAgICAkJCQxKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgIHZhciBtYXJnaW4gPSAkJCQxKGVsZW1lbnQpLmRhdGEoJ21hcmdpbi1yaWdodCcpO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiBtYXJnaW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAkJCQxKGVsZW1lbnQpLmNzcygnbWFyZ2luLXJpZ2h0JywgbWFyZ2luKS5yZW1vdmVEYXRhKCdtYXJnaW4tcmlnaHQnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pOyAvLyBSZXN0b3JlIGJvZHkgcGFkZGluZ1xuXG4gICAgICAgIHZhciBwYWRkaW5nID0gJCQkMShkb2N1bWVudC5ib2R5KS5kYXRhKCdwYWRkaW5nLXJpZ2h0Jyk7XG4gICAgICAgICQkJDEoZG9jdW1lbnQuYm9keSkucmVtb3ZlRGF0YSgncGFkZGluZy1yaWdodCcpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodCA9IHBhZGRpbmcgPyBwYWRkaW5nIDogJyc7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2dldFNjcm9sbGJhcldpZHRoID0gZnVuY3Rpb24gX2dldFNjcm9sbGJhcldpZHRoKCkge1xuICAgICAgICAvLyB0aHggZC53YWxzaFxuICAgICAgICB2YXIgc2Nyb2xsRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHNjcm9sbERpdi5jbGFzc05hbWUgPSBDbGFzc05hbWUuU0NST0xMQkFSX01FQVNVUkVSO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcm9sbERpdik7XG4gICAgICAgIHZhciBzY3JvbGxiYXJXaWR0aCA9IHNjcm9sbERpdi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aCAtIHNjcm9sbERpdi5jbGllbnRXaWR0aDtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChzY3JvbGxEaXYpO1xuICAgICAgICByZXR1cm4gc2Nyb2xsYmFyV2lkdGg7XG4gICAgICB9OyAvLyBTdGF0aWNcblxuXG4gICAgICBNb2RhbC5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcsIHJlbGF0ZWRUYXJnZXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSAkJCQxKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgICAgdmFyIF9jb25maWcgPSBfb2JqZWN0U3ByZWFkKHt9LCBEZWZhdWx0LCAkJCQxKHRoaXMpLmRhdGEoKSwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICBkYXRhID0gbmV3IE1vZGFsKHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICAgJCQkMSh0aGlzKS5kYXRhKERBVEFfS0VZLCBkYXRhKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtjb25maWddID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTm8gbWV0aG9kIG5hbWVkIFxcXCJcIiArIGNvbmZpZyArIFwiXFxcIlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGF0YVtjb25maWddKHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoX2NvbmZpZy5zaG93KSB7XG4gICAgICAgICAgICBkYXRhLnNob3cocmVsYXRlZFRhcmdldCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIF9jcmVhdGVDbGFzcyhNb2RhbCwgbnVsbCwgW3tcbiAgICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1dKTtcblxuICAgICAgcmV0dXJuIE1vZGFsO1xuICAgIH0oKTtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG5cbiAgICAkJCQxKGRvY3VtZW50KS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9UT0dHTEUsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdmFyIF90aGlzMTAgPSB0aGlzO1xuXG4gICAgICB2YXIgdGFyZ2V0O1xuICAgICAgdmFyIHNlbGVjdG9yID0gVXRpbC5nZXRTZWxlY3RvckZyb21FbGVtZW50KHRoaXMpO1xuXG4gICAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgICAgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICB9XG5cbiAgICAgIHZhciBjb25maWcgPSAkJCQxKHRhcmdldCkuZGF0YShEQVRBX0tFWSkgPyAndG9nZ2xlJyA6IF9vYmplY3RTcHJlYWQoe30sICQkJDEodGFyZ2V0KS5kYXRhKCksICQkJDEodGhpcykuZGF0YSgpKTtcblxuICAgICAgaWYgKHRoaXMudGFnTmFtZSA9PT0gJ0EnIHx8IHRoaXMudGFnTmFtZSA9PT0gJ0FSRUEnKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG5cbiAgICAgIHZhciAkdGFyZ2V0ID0gJCQkMSh0YXJnZXQpLm9uZShFdmVudC5TSE9XLCBmdW5jdGlvbiAoc2hvd0V2ZW50KSB7XG4gICAgICAgIGlmIChzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgICAvLyBPbmx5IHJlZ2lzdGVyIGZvY3VzIHJlc3RvcmVyIGlmIG1vZGFsIHdpbGwgYWN0dWFsbHkgZ2V0IHNob3duXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJHRhcmdldC5vbmUoRXZlbnQuSElEREVOLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCQkJDEoX3RoaXMxMCkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgIF90aGlzMTAuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIE1vZGFsLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkJCQxKHRhcmdldCksIGNvbmZpZywgdGhpcyk7XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogalF1ZXJ5XG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgICAkJCQxLmZuW05BTUVdID0gTW9kYWwuX2pRdWVyeUludGVyZmFjZTtcbiAgICAkJCQxLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gTW9kYWw7XG5cbiAgICAkJCQxLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkJCQxLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgICAgcmV0dXJuIE1vZGFsLl9qUXVlcnlJbnRlcmZhY2U7XG4gICAgfTtcblxuICAgIHJldHVybiBNb2RhbDtcbiAgfSgkKTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQm9vdHN0cmFwICh2NC4xLjMpOiB0b29sdGlwLmpzXG4gICAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBUb29sdGlwID0gZnVuY3Rpb24gKCQkJDEpIHtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDb25zdGFudHNcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cbiAgICB2YXIgTkFNRSA9ICd0b29sdGlwJztcbiAgICB2YXIgVkVSU0lPTiA9ICc0LjEuMyc7XG4gICAgdmFyIERBVEFfS0VZID0gJ2JzLnRvb2x0aXAnO1xuICAgIHZhciBFVkVOVF9LRVkgPSBcIi5cIiArIERBVEFfS0VZO1xuICAgIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkJCQxLmZuW05BTUVdO1xuICAgIHZhciBDTEFTU19QUkVGSVggPSAnYnMtdG9vbHRpcCc7XG4gICAgdmFyIEJTQ0xTX1BSRUZJWF9SRUdFWCA9IG5ldyBSZWdFeHAoXCIoXnxcXFxccylcIiArIENMQVNTX1BSRUZJWCArIFwiXFxcXFMrXCIsICdnJyk7XG4gICAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgICAgYW5pbWF0aW9uOiAnYm9vbGVhbicsXG4gICAgICB0ZW1wbGF0ZTogJ3N0cmluZycsXG4gICAgICB0aXRsZTogJyhzdHJpbmd8ZWxlbWVudHxmdW5jdGlvbiknLFxuICAgICAgdHJpZ2dlcjogJ3N0cmluZycsXG4gICAgICBkZWxheTogJyhudW1iZXJ8b2JqZWN0KScsXG4gICAgICBodG1sOiAnYm9vbGVhbicsXG4gICAgICBzZWxlY3RvcjogJyhzdHJpbmd8Ym9vbGVhbiknLFxuICAgICAgcGxhY2VtZW50OiAnKHN0cmluZ3xmdW5jdGlvbiknLFxuICAgICAgb2Zmc2V0OiAnKG51bWJlcnxzdHJpbmcpJyxcbiAgICAgIGNvbnRhaW5lcjogJyhzdHJpbmd8ZWxlbWVudHxib29sZWFuKScsXG4gICAgICBmYWxsYmFja1BsYWNlbWVudDogJyhzdHJpbmd8YXJyYXkpJyxcbiAgICAgIGJvdW5kYXJ5OiAnKHN0cmluZ3xlbGVtZW50KSdcbiAgICB9O1xuICAgIHZhciBBdHRhY2htZW50TWFwID0ge1xuICAgICAgQVVUTzogJ2F1dG8nLFxuICAgICAgVE9QOiAndG9wJyxcbiAgICAgIFJJR0hUOiAncmlnaHQnLFxuICAgICAgQk9UVE9NOiAnYm90dG9tJyxcbiAgICAgIExFRlQ6ICdsZWZ0J1xuICAgIH07XG4gICAgdmFyIERlZmF1bHQgPSB7XG4gICAgICBhbmltYXRpb246IHRydWUsXG4gICAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ0b29sdGlwXCIgcm9sZT1cInRvb2x0aXBcIj4nICsgJzxkaXYgY2xhc3M9XCJhcnJvd1wiPjwvZGl2PicgKyAnPGRpdiBjbGFzcz1cInRvb2x0aXAtaW5uZXJcIj48L2Rpdj48L2Rpdj4nLFxuICAgICAgdHJpZ2dlcjogJ2hvdmVyIGZvY3VzJyxcbiAgICAgIHRpdGxlOiAnJyxcbiAgICAgIGRlbGF5OiAwLFxuICAgICAgaHRtbDogZmFsc2UsXG4gICAgICBzZWxlY3RvcjogZmFsc2UsXG4gICAgICBwbGFjZW1lbnQ6ICd0b3AnLFxuICAgICAgb2Zmc2V0OiAwLFxuICAgICAgY29udGFpbmVyOiBmYWxzZSxcbiAgICAgIGZhbGxiYWNrUGxhY2VtZW50OiAnZmxpcCcsXG4gICAgICBib3VuZGFyeTogJ3Njcm9sbFBhcmVudCdcbiAgICB9O1xuICAgIHZhciBIb3ZlclN0YXRlID0ge1xuICAgICAgU0hPVzogJ3Nob3cnLFxuICAgICAgT1VUOiAnb3V0J1xuICAgIH07XG4gICAgdmFyIEV2ZW50ID0ge1xuICAgICAgSElERTogXCJoaWRlXCIgKyBFVkVOVF9LRVksXG4gICAgICBISURERU46IFwiaGlkZGVuXCIgKyBFVkVOVF9LRVksXG4gICAgICBTSE9XOiBcInNob3dcIiArIEVWRU5UX0tFWSxcbiAgICAgIFNIT1dOOiBcInNob3duXCIgKyBFVkVOVF9LRVksXG4gICAgICBJTlNFUlRFRDogXCJpbnNlcnRlZFwiICsgRVZFTlRfS0VZLFxuICAgICAgQ0xJQ0s6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSxcbiAgICAgIEZPQ1VTSU46IFwiZm9jdXNpblwiICsgRVZFTlRfS0VZLFxuICAgICAgRk9DVVNPVVQ6IFwiZm9jdXNvdXRcIiArIEVWRU5UX0tFWSxcbiAgICAgIE1PVVNFRU5URVI6IFwibW91c2VlbnRlclwiICsgRVZFTlRfS0VZLFxuICAgICAgTU9VU0VMRUFWRTogXCJtb3VzZWxlYXZlXCIgKyBFVkVOVF9LRVlcbiAgICB9O1xuICAgIHZhciBDbGFzc05hbWUgPSB7XG4gICAgICBGQURFOiAnZmFkZScsXG4gICAgICBTSE9XOiAnc2hvdydcbiAgICB9O1xuICAgIHZhciBTZWxlY3RvciA9IHtcbiAgICAgIFRPT0xUSVA6ICcudG9vbHRpcCcsXG4gICAgICBUT09MVElQX0lOTkVSOiAnLnRvb2x0aXAtaW5uZXInLFxuICAgICAgQVJST1c6ICcuYXJyb3cnXG4gICAgfTtcbiAgICB2YXIgVHJpZ2dlciA9IHtcbiAgICAgIEhPVkVSOiAnaG92ZXInLFxuICAgICAgRk9DVVM6ICdmb2N1cycsXG4gICAgICBDTElDSzogJ2NsaWNrJyxcbiAgICAgIE1BTlVBTDogJ21hbnVhbCdcbiAgICAgIC8qKlxuICAgICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAqL1xuXG4gICAgfTtcblxuICAgIHZhciBUb29sdGlwID1cbiAgICAvKiNfX1BVUkVfXyovXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgZnVuY3Rpb24gVG9vbHRpcChlbGVtZW50LCBjb25maWcpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrIGZvciBQb3BwZXIgZGVwZW5kZW5jeVxuICAgICAgICAgKiBQb3BwZXIgLSBodHRwczovL3BvcHBlci5qcy5vcmdcbiAgICAgICAgICovXG4gICAgICAgIGlmICh0eXBlb2YgUG9wcGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Jvb3RzdHJhcCB0b29sdGlwcyByZXF1aXJlIFBvcHBlci5qcyAoaHR0cHM6Ly9wb3BwZXIuanMub3JnKScpO1xuICAgICAgICB9IC8vIHByaXZhdGVcblxuXG4gICAgICAgIHRoaXMuX2lzRW5hYmxlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSAwO1xuICAgICAgICB0aGlzLl9ob3ZlclN0YXRlID0gJyc7XG4gICAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXIgPSB7fTtcbiAgICAgICAgdGhpcy5fcG9wcGVyID0gbnVsbDsgLy8gUHJvdGVjdGVkXG5cbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgICAgdGhpcy5jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgICAgdGhpcy50aXAgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuX3NldExpc3RlbmVycygpO1xuICAgICAgfSAvLyBHZXR0ZXJzXG5cblxuICAgICAgdmFyIF9wcm90byA9IFRvb2x0aXAucHJvdG90eXBlO1xuXG4gICAgICAvLyBQdWJsaWNcbiAgICAgIF9wcm90by5lbmFibGUgPSBmdW5jdGlvbiBlbmFibGUoKSB7XG4gICAgICAgIHRoaXMuX2lzRW5hYmxlZCA9IHRydWU7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uZGlzYWJsZSA9IGZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gICAgICAgIHRoaXMuX2lzRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLnRvZ2dsZUVuYWJsZWQgPSBmdW5jdGlvbiB0b2dnbGVFbmFibGVkKCkge1xuICAgICAgICB0aGlzLl9pc0VuYWJsZWQgPSAhdGhpcy5faXNFbmFibGVkO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMuX2lzRW5hYmxlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgIHZhciBkYXRhS2V5ID0gdGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWTtcbiAgICAgICAgICB2YXIgY29udGV4dCA9ICQkJDEoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YShkYXRhS2V5KTtcblxuICAgICAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICAgICAgY29udGV4dCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGV2ZW50LmN1cnJlbnRUYXJnZXQsIHRoaXMuX2dldERlbGVnYXRlQ29uZmlnKCkpO1xuICAgICAgICAgICAgJCQkMShldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXksIGNvbnRleHQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnRleHQuX2FjdGl2ZVRyaWdnZXIuY2xpY2sgPSAhY29udGV4dC5fYWN0aXZlVHJpZ2dlci5jbGljaztcblxuICAgICAgICAgIGlmIChjb250ZXh0Ll9pc1dpdGhBY3RpdmVUcmlnZ2VyKCkpIHtcbiAgICAgICAgICAgIGNvbnRleHQuX2VudGVyKG51bGwsIGNvbnRleHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250ZXh0Ll9sZWF2ZShudWxsLCBjb250ZXh0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCQkJDEodGhpcy5nZXRUaXBFbGVtZW50KCkpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKSkge1xuICAgICAgICAgICAgdGhpcy5fbGVhdmUobnVsbCwgdGhpcyk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLl9lbnRlcihudWxsLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dCk7XG4gICAgICAgICQkJDEucmVtb3ZlRGF0YSh0aGlzLmVsZW1lbnQsIHRoaXMuY29uc3RydWN0b3IuREFUQV9LRVkpO1xuICAgICAgICAkJCQxKHRoaXMuZWxlbWVudCkub2ZmKHRoaXMuY29uc3RydWN0b3IuRVZFTlRfS0VZKTtcbiAgICAgICAgJCQkMSh0aGlzLmVsZW1lbnQpLmNsb3Nlc3QoJy5tb2RhbCcpLm9mZignaGlkZS5icy5tb2RhbCcpO1xuXG4gICAgICAgIGlmICh0aGlzLnRpcCkge1xuICAgICAgICAgICQkJDEodGhpcy50aXApLnJlbW92ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faXNFbmFibGVkID0gbnVsbDtcbiAgICAgICAgdGhpcy5fdGltZW91dCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2hvdmVyU3RhdGUgPSBudWxsO1xuICAgICAgICB0aGlzLl9hY3RpdmVUcmlnZ2VyID0gbnVsbDtcblxuICAgICAgICBpZiAodGhpcy5fcG9wcGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5fcG9wcGVyLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BvcHBlciA9IG51bGw7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuY29uZmlnID0gbnVsbDtcbiAgICAgICAgdGhpcy50aXAgPSBudWxsO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLnNob3cgPSBmdW5jdGlvbiBzaG93KCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIGlmICgkJCQxKHRoaXMuZWxlbWVudCkuY3NzKCdkaXNwbGF5JykgPT09ICdub25lJykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHVzZSBzaG93IG9uIHZpc2libGUgZWxlbWVudHMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzaG93RXZlbnQgPSAkJCQxLkV2ZW50KHRoaXMuY29uc3RydWN0b3IuRXZlbnQuU0hPVyk7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNXaXRoQ29udGVudCgpICYmIHRoaXMuX2lzRW5hYmxlZCkge1xuICAgICAgICAgICQkJDEodGhpcy5lbGVtZW50KS50cmlnZ2VyKHNob3dFdmVudCk7XG4gICAgICAgICAgdmFyIGlzSW5UaGVEb20gPSAkJCQxLmNvbnRhaW5zKHRoaXMuZWxlbWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgdGhpcy5lbGVtZW50KTtcblxuICAgICAgICAgIGlmIChzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgfHwgIWlzSW5UaGVEb20pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgdGlwID0gdGhpcy5nZXRUaXBFbGVtZW50KCk7XG4gICAgICAgICAgdmFyIHRpcElkID0gVXRpbC5nZXRVSUQodGhpcy5jb25zdHJ1Y3Rvci5OQU1FKTtcbiAgICAgICAgICB0aXAuc2V0QXR0cmlidXRlKCdpZCcsIHRpcElkKTtcbiAgICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWRlc2NyaWJlZGJ5JywgdGlwSWQpO1xuICAgICAgICAgIHRoaXMuc2V0Q29udGVudCgpO1xuXG4gICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmFuaW1hdGlvbikge1xuICAgICAgICAgICAgJCQkMSh0aXApLmFkZENsYXNzKENsYXNzTmFtZS5GQURFKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgcGxhY2VtZW50ID0gdHlwZW9mIHRoaXMuY29uZmlnLnBsYWNlbWVudCA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuY29uZmlnLnBsYWNlbWVudC5jYWxsKHRoaXMsIHRpcCwgdGhpcy5lbGVtZW50KSA6IHRoaXMuY29uZmlnLnBsYWNlbWVudDtcblxuICAgICAgICAgIHZhciBhdHRhY2htZW50ID0gdGhpcy5fZ2V0QXR0YWNobWVudChwbGFjZW1lbnQpO1xuXG4gICAgICAgICAgdGhpcy5hZGRBdHRhY2htZW50Q2xhc3MoYXR0YWNobWVudCk7XG4gICAgICAgICAgdmFyIGNvbnRhaW5lciA9IHRoaXMuY29uZmlnLmNvbnRhaW5lciA9PT0gZmFsc2UgPyBkb2N1bWVudC5ib2R5IDogJCQkMShkb2N1bWVudCkuZmluZCh0aGlzLmNvbmZpZy5jb250YWluZXIpO1xuICAgICAgICAgICQkJDEodGlwKS5kYXRhKHRoaXMuY29uc3RydWN0b3IuREFUQV9LRVksIHRoaXMpO1xuXG4gICAgICAgICAgaWYgKCEkJCQxLmNvbnRhaW5zKHRoaXMuZWxlbWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgdGhpcy50aXApKSB7XG4gICAgICAgICAgICAkJCQxKHRpcCkuYXBwZW5kVG8oY29udGFpbmVyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkJCQxKHRoaXMuZWxlbWVudCkudHJpZ2dlcih0aGlzLmNvbnN0cnVjdG9yLkV2ZW50LklOU0VSVEVEKTtcbiAgICAgICAgICB0aGlzLl9wb3BwZXIgPSBuZXcgUG9wcGVyKHRoaXMuZWxlbWVudCwgdGlwLCB7XG4gICAgICAgICAgICBwbGFjZW1lbnQ6IGF0dGFjaG1lbnQsXG4gICAgICAgICAgICBtb2RpZmllcnM6IHtcbiAgICAgICAgICAgICAgb2Zmc2V0OiB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0OiB0aGlzLmNvbmZpZy5vZmZzZXRcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZmxpcDoge1xuICAgICAgICAgICAgICAgIGJlaGF2aW9yOiB0aGlzLmNvbmZpZy5mYWxsYmFja1BsYWNlbWVudFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBhcnJvdzoge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6IFNlbGVjdG9yLkFSUk9XXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHByZXZlbnRPdmVyZmxvdzoge1xuICAgICAgICAgICAgICAgIGJvdW5kYXJpZXNFbGVtZW50OiB0aGlzLmNvbmZpZy5ib3VuZGFyeVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DcmVhdGU6IGZ1bmN0aW9uIG9uQ3JlYXRlKGRhdGEpIHtcbiAgICAgICAgICAgICAgaWYgKGRhdGEub3JpZ2luYWxQbGFjZW1lbnQgIT09IGRhdGEucGxhY2VtZW50KSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuX2hhbmRsZVBvcHBlclBsYWNlbWVudENoYW5nZShkYXRhKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVXBkYXRlOiBmdW5jdGlvbiBvblVwZGF0ZShkYXRhKSB7XG4gICAgICAgICAgICAgIF90aGlzLl9oYW5kbGVQb3BwZXJQbGFjZW1lbnRDaGFuZ2UoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgJCQkMSh0aXApLmFkZENsYXNzKENsYXNzTmFtZS5TSE9XKTsgLy8gSWYgdGhpcyBpcyBhIHRvdWNoLWVuYWJsZWQgZGV2aWNlIHdlIGFkZCBleHRyYVxuICAgICAgICAgIC8vIGVtcHR5IG1vdXNlb3ZlciBsaXN0ZW5lcnMgdG8gdGhlIGJvZHkncyBpbW1lZGlhdGUgY2hpbGRyZW47XG4gICAgICAgICAgLy8gb25seSBuZWVkZWQgYmVjYXVzZSBvZiBicm9rZW4gZXZlbnQgZGVsZWdhdGlvbiBvbiBpT1NcbiAgICAgICAgICAvLyBodHRwczovL3d3dy5xdWlya3Ntb2RlLm9yZy9ibG9nL2FyY2hpdmVzLzIwMTQvMDIvbW91c2VfZXZlbnRfYnViLmh0bWxcblxuICAgICAgICAgIGlmICgnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpIHtcbiAgICAgICAgICAgICQkJDEoZG9jdW1lbnQuYm9keSkuY2hpbGRyZW4oKS5vbignbW91c2VvdmVyJywgbnVsbCwgJCQkMS5ub29wKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5jb25maWcuYW5pbWF0aW9uKSB7XG4gICAgICAgICAgICAgIF90aGlzLl9maXhUcmFuc2l0aW9uKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwcmV2SG92ZXJTdGF0ZSA9IF90aGlzLl9ob3ZlclN0YXRlO1xuICAgICAgICAgICAgX3RoaXMuX2hvdmVyU3RhdGUgPSBudWxsO1xuICAgICAgICAgICAgJCQkMShfdGhpcy5lbGVtZW50KS50cmlnZ2VyKF90aGlzLmNvbnN0cnVjdG9yLkV2ZW50LlNIT1dOKTtcblxuICAgICAgICAgICAgaWYgKHByZXZIb3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLk9VVCkge1xuICAgICAgICAgICAgICBfdGhpcy5fbGVhdmUobnVsbCwgX3RoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoJCQkMSh0aGlzLnRpcCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpKSB7XG4gICAgICAgICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudCh0aGlzLnRpcCk7XG4gICAgICAgICAgICAkJCQxKHRoaXMudGlwKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBsZXRlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uaGlkZSA9IGZ1bmN0aW9uIGhpZGUoY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHRpcCA9IHRoaXMuZ2V0VGlwRWxlbWVudCgpO1xuICAgICAgICB2YXIgaGlkZUV2ZW50ID0gJCQkMS5FdmVudCh0aGlzLmNvbnN0cnVjdG9yLkV2ZW50LkhJREUpO1xuXG4gICAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAgIGlmIChfdGhpczIuX2hvdmVyU3RhdGUgIT09IEhvdmVyU3RhdGUuU0hPVyAmJiB0aXAucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgdGlwLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGlwKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBfdGhpczIuX2NsZWFuVGlwQ2xhc3MoKTtcblxuICAgICAgICAgIF90aGlzMi5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnYXJpYS1kZXNjcmliZWRieScpO1xuXG4gICAgICAgICAgJCQkMShfdGhpczIuZWxlbWVudCkudHJpZ2dlcihfdGhpczIuY29uc3RydWN0b3IuRXZlbnQuSElEREVOKTtcblxuICAgICAgICAgIGlmIChfdGhpczIuX3BvcHBlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgX3RoaXMyLl9wb3BwZXIuZGVzdHJveSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJCQkMSh0aGlzLmVsZW1lbnQpLnRyaWdnZXIoaGlkZUV2ZW50KTtcblxuICAgICAgICBpZiAoaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQkMSh0aXApLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5TSE9XKTsgLy8gSWYgdGhpcyBpcyBhIHRvdWNoLWVuYWJsZWQgZGV2aWNlIHdlIHJlbW92ZSB0aGUgZXh0cmFcbiAgICAgICAgLy8gZW1wdHkgbW91c2VvdmVyIGxpc3RlbmVycyB3ZSBhZGRlZCBmb3IgaU9TIHN1cHBvcnRcblxuICAgICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgICAgICAgJCQkMShkb2N1bWVudC5ib2R5KS5jaGlsZHJlbigpLm9mZignbW91c2VvdmVyJywgbnVsbCwgJCQkMS5ub29wKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXJbVHJpZ2dlci5DTElDS10gPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fYWN0aXZlVHJpZ2dlcltUcmlnZ2VyLkZPQ1VTXSA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9hY3RpdmVUcmlnZ2VyW1RyaWdnZXIuSE9WRVJdID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKCQkJDEodGhpcy50aXApLmhhc0NsYXNzKENsYXNzTmFtZS5GQURFKSkge1xuICAgICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRpcCk7XG4gICAgICAgICAgJCQkMSh0aXApLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQodHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faG92ZXJTdGF0ZSA9ICcnO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3BvcHBlciAhPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuX3BvcHBlci5zY2hlZHVsZVVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgICB9OyAvLyBQcm90ZWN0ZWRcblxuXG4gICAgICBfcHJvdG8uaXNXaXRoQ29udGVudCA9IGZ1bmN0aW9uIGlzV2l0aENvbnRlbnQoKSB7XG4gICAgICAgIHJldHVybiBCb29sZWFuKHRoaXMuZ2V0VGl0bGUoKSk7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uYWRkQXR0YWNobWVudENsYXNzID0gZnVuY3Rpb24gYWRkQXR0YWNobWVudENsYXNzKGF0dGFjaG1lbnQpIHtcbiAgICAgICAgJCQkMSh0aGlzLmdldFRpcEVsZW1lbnQoKSkuYWRkQ2xhc3MoQ0xBU1NfUFJFRklYICsgXCItXCIgKyBhdHRhY2htZW50KTtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5nZXRUaXBFbGVtZW50ID0gZnVuY3Rpb24gZ2V0VGlwRWxlbWVudCgpIHtcbiAgICAgICAgdGhpcy50aXAgPSB0aGlzLnRpcCB8fCAkJCQxKHRoaXMuY29uZmlnLnRlbXBsYXRlKVswXTtcbiAgICAgICAgcmV0dXJuIHRoaXMudGlwO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLnNldENvbnRlbnQgPSBmdW5jdGlvbiBzZXRDb250ZW50KCkge1xuICAgICAgICB2YXIgdGlwID0gdGhpcy5nZXRUaXBFbGVtZW50KCk7XG4gICAgICAgIHRoaXMuc2V0RWxlbWVudENvbnRlbnQoJCQkMSh0aXAucXVlcnlTZWxlY3RvckFsbChTZWxlY3Rvci5UT09MVElQX0lOTkVSKSksIHRoaXMuZ2V0VGl0bGUoKSk7XG4gICAgICAgICQkJDEodGlwKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuRkFERSArIFwiIFwiICsgQ2xhc3NOYW1lLlNIT1cpO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLnNldEVsZW1lbnRDb250ZW50ID0gZnVuY3Rpb24gc2V0RWxlbWVudENvbnRlbnQoJGVsZW1lbnQsIGNvbnRlbnQpIHtcbiAgICAgICAgdmFyIGh0bWwgPSB0aGlzLmNvbmZpZy5odG1sO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ29iamVjdCcgJiYgKGNvbnRlbnQubm9kZVR5cGUgfHwgY29udGVudC5qcXVlcnkpKSB7XG4gICAgICAgICAgLy8gQ29udGVudCBpcyBhIERPTSBub2RlIG9yIGEgalF1ZXJ5XG4gICAgICAgICAgaWYgKGh0bWwpIHtcbiAgICAgICAgICAgIGlmICghJCQkMShjb250ZW50KS5wYXJlbnQoKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgJGVsZW1lbnQuZW1wdHkoKS5hcHBlbmQoY29udGVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRlbGVtZW50LnRleHQoJCQkMShjb250ZW50KS50ZXh0KCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkZWxlbWVudFtodG1sID8gJ2h0bWwnIDogJ3RleHQnXShjb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmdldFRpdGxlID0gZnVuY3Rpb24gZ2V0VGl0bGUoKSB7XG4gICAgICAgIHZhciB0aXRsZSA9IHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtb3JpZ2luYWwtdGl0bGUnKTtcblxuICAgICAgICBpZiAoIXRpdGxlKSB7XG4gICAgICAgICAgdGl0bGUgPSB0eXBlb2YgdGhpcy5jb25maWcudGl0bGUgPT09ICdmdW5jdGlvbicgPyB0aGlzLmNvbmZpZy50aXRsZS5jYWxsKHRoaXMuZWxlbWVudCkgOiB0aGlzLmNvbmZpZy50aXRsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aXRsZTtcbiAgICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgICBfcHJvdG8uX2dldEF0dGFjaG1lbnQgPSBmdW5jdGlvbiBfZ2V0QXR0YWNobWVudChwbGFjZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIEF0dGFjaG1lbnRNYXBbcGxhY2VtZW50LnRvVXBwZXJDYXNlKCldO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9zZXRMaXN0ZW5lcnMgPSBmdW5jdGlvbiBfc2V0TGlzdGVuZXJzKCkge1xuICAgICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgICB2YXIgdHJpZ2dlcnMgPSB0aGlzLmNvbmZpZy50cmlnZ2VyLnNwbGl0KCcgJyk7XG4gICAgICAgIHRyaWdnZXJzLmZvckVhY2goZnVuY3Rpb24gKHRyaWdnZXIpIHtcbiAgICAgICAgICBpZiAodHJpZ2dlciA9PT0gJ2NsaWNrJykge1xuICAgICAgICAgICAgJCQkMShfdGhpczMuZWxlbWVudCkub24oX3RoaXMzLmNvbnN0cnVjdG9yLkV2ZW50LkNMSUNLLCBfdGhpczMuY29uZmlnLnNlbGVjdG9yLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIF90aGlzMy50b2dnbGUoZXZlbnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0cmlnZ2VyICE9PSBUcmlnZ2VyLk1BTlVBTCkge1xuICAgICAgICAgICAgdmFyIGV2ZW50SW4gPSB0cmlnZ2VyID09PSBUcmlnZ2VyLkhPVkVSID8gX3RoaXMzLmNvbnN0cnVjdG9yLkV2ZW50Lk1PVVNFRU5URVIgOiBfdGhpczMuY29uc3RydWN0b3IuRXZlbnQuRk9DVVNJTjtcbiAgICAgICAgICAgIHZhciBldmVudE91dCA9IHRyaWdnZXIgPT09IFRyaWdnZXIuSE9WRVIgPyBfdGhpczMuY29uc3RydWN0b3IuRXZlbnQuTU9VU0VMRUFWRSA6IF90aGlzMy5jb25zdHJ1Y3Rvci5FdmVudC5GT0NVU09VVDtcbiAgICAgICAgICAgICQkJDEoX3RoaXMzLmVsZW1lbnQpLm9uKGV2ZW50SW4sIF90aGlzMy5jb25maWcuc2VsZWN0b3IsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICByZXR1cm4gX3RoaXMzLl9lbnRlcihldmVudCk7XG4gICAgICAgICAgICB9KS5vbihldmVudE91dCwgX3RoaXMzLmNvbmZpZy5zZWxlY3RvciwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgIHJldHVybiBfdGhpczMuX2xlYXZlKGV2ZW50KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICQkJDEoX3RoaXMzLmVsZW1lbnQpLmNsb3Nlc3QoJy5tb2RhbCcpLm9uKCdoaWRlLmJzLm1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzMy5oaWRlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5zZWxlY3Rvcikge1xuICAgICAgICAgIHRoaXMuY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgdGhpcy5jb25maWcsIHtcbiAgICAgICAgICAgIHRyaWdnZXI6ICdtYW51YWwnLFxuICAgICAgICAgICAgc2VsZWN0b3I6ICcnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZml4VGl0bGUoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9maXhUaXRsZSA9IGZ1bmN0aW9uIF9maXhUaXRsZSgpIHtcbiAgICAgICAgdmFyIHRpdGxlVHlwZSA9IHR5cGVvZiB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW9yaWdpbmFsLXRpdGxlJyk7XG5cbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykgfHwgdGl0bGVUeXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtb3JpZ2luYWwtdGl0bGUnLCB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCd0aXRsZScpIHx8ICcnKTtcbiAgICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKCd0aXRsZScsICcnKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9lbnRlciA9IGZ1bmN0aW9uIF9lbnRlcihldmVudCwgY29udGV4dCkge1xuICAgICAgICB2YXIgZGF0YUtleSA9IHRoaXMuY29uc3RydWN0b3IuREFUQV9LRVk7XG4gICAgICAgIGNvbnRleHQgPSBjb250ZXh0IHx8ICQkJDEoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YShkYXRhS2V5KTtcblxuICAgICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgICBjb250ZXh0ID0gbmV3IHRoaXMuY29uc3RydWN0b3IoZXZlbnQuY3VycmVudFRhcmdldCwgdGhpcy5fZ2V0RGVsZWdhdGVDb25maWcoKSk7XG4gICAgICAgICAgJCQkMShldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXksIGNvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgY29udGV4dC5fYWN0aXZlVHJpZ2dlcltldmVudC50eXBlID09PSAnZm9jdXNpbicgPyBUcmlnZ2VyLkZPQ1VTIDogVHJpZ2dlci5IT1ZFUl0gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCQkJDEoY29udGV4dC5nZXRUaXBFbGVtZW50KCkpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKSB8fCBjb250ZXh0Ll9ob3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLlNIT1cpIHtcbiAgICAgICAgICBjb250ZXh0Ll9ob3ZlclN0YXRlID0gSG92ZXJTdGF0ZS5TSE9XO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNsZWFyVGltZW91dChjb250ZXh0Ll90aW1lb3V0KTtcbiAgICAgICAgY29udGV4dC5faG92ZXJTdGF0ZSA9IEhvdmVyU3RhdGUuU0hPVztcblxuICAgICAgICBpZiAoIWNvbnRleHQuY29uZmlnLmRlbGF5IHx8ICFjb250ZXh0LmNvbmZpZy5kZWxheS5zaG93KSB7XG4gICAgICAgICAgY29udGV4dC5zaG93KCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5fdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Ll9ob3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLlNIT1cpIHtcbiAgICAgICAgICAgIGNvbnRleHQuc2hvdygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgY29udGV4dC5jb25maWcuZGVsYXkuc2hvdyk7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2xlYXZlID0gZnVuY3Rpb24gX2xlYXZlKGV2ZW50LCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBkYXRhS2V5ID0gdGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWTtcbiAgICAgICAgY29udGV4dCA9IGNvbnRleHQgfHwgJCQkMShldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXkpO1xuXG4gICAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICAgIGNvbnRleHQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihldmVudC5jdXJyZW50VGFyZ2V0LCB0aGlzLl9nZXREZWxlZ2F0ZUNvbmZpZygpKTtcbiAgICAgICAgICAkJCQxKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmRhdGEoZGF0YUtleSwgY29udGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICBjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyW2V2ZW50LnR5cGUgPT09ICdmb2N1c291dCcgPyBUcmlnZ2VyLkZPQ1VTIDogVHJpZ2dlci5IT1ZFUl0gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb250ZXh0Ll9pc1dpdGhBY3RpdmVUcmlnZ2VyKCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjbGVhclRpbWVvdXQoY29udGV4dC5fdGltZW91dCk7XG4gICAgICAgIGNvbnRleHQuX2hvdmVyU3RhdGUgPSBIb3ZlclN0YXRlLk9VVDtcblxuICAgICAgICBpZiAoIWNvbnRleHQuY29uZmlnLmRlbGF5IHx8ICFjb250ZXh0LmNvbmZpZy5kZWxheS5oaWRlKSB7XG4gICAgICAgICAgY29udGV4dC5oaWRlKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5fdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Ll9ob3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLk9VVCkge1xuICAgICAgICAgICAgY29udGV4dC5oaWRlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBjb250ZXh0LmNvbmZpZy5kZWxheS5oaWRlKTtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5faXNXaXRoQWN0aXZlVHJpZ2dlciA9IGZ1bmN0aW9uIF9pc1dpdGhBY3RpdmVUcmlnZ2VyKCkge1xuICAgICAgICBmb3IgKHZhciB0cmlnZ2VyIGluIHRoaXMuX2FjdGl2ZVRyaWdnZXIpIHtcbiAgICAgICAgICBpZiAodGhpcy5fYWN0aXZlVHJpZ2dlclt0cmlnZ2VyXSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgICBjb25maWcgPSBfb2JqZWN0U3ByZWFkKHt9LCB0aGlzLmNvbnN0cnVjdG9yLkRlZmF1bHQsICQkJDEodGhpcy5lbGVtZW50KS5kYXRhKCksIHR5cGVvZiBjb25maWcgPT09ICdvYmplY3QnICYmIGNvbmZpZyA/IGNvbmZpZyA6IHt9KTtcblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5kZWxheSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBjb25maWcuZGVsYXkgPSB7XG4gICAgICAgICAgICBzaG93OiBjb25maWcuZGVsYXksXG4gICAgICAgICAgICBoaWRlOiBjb25maWcuZGVsYXlcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcudGl0bGUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgY29uZmlnLnRpdGxlID0gY29uZmlnLnRpdGxlLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5jb250ZW50ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIGNvbmZpZy5jb250ZW50ID0gY29uZmlnLmNvbnRlbnQudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUsIGNvbmZpZywgdGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0VHlwZSk7XG4gICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2dldERlbGVnYXRlQ29uZmlnID0gZnVuY3Rpb24gX2dldERlbGVnYXRlQ29uZmlnKCkge1xuICAgICAgICB2YXIgY29uZmlnID0ge307XG5cbiAgICAgICAgaWYgKHRoaXMuY29uZmlnKSB7XG4gICAgICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMuY29uZmlnKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0W2tleV0gIT09IHRoaXMuY29uZmlnW2tleV0pIHtcbiAgICAgICAgICAgICAgY29uZmlnW2tleV0gPSB0aGlzLmNvbmZpZ1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2NsZWFuVGlwQ2xhc3MgPSBmdW5jdGlvbiBfY2xlYW5UaXBDbGFzcygpIHtcbiAgICAgICAgdmFyICR0aXAgPSAkJCQxKHRoaXMuZ2V0VGlwRWxlbWVudCgpKTtcbiAgICAgICAgdmFyIHRhYkNsYXNzID0gJHRpcC5hdHRyKCdjbGFzcycpLm1hdGNoKEJTQ0xTX1BSRUZJWF9SRUdFWCk7XG5cbiAgICAgICAgaWYgKHRhYkNsYXNzICE9PSBudWxsICYmIHRhYkNsYXNzLmxlbmd0aCkge1xuICAgICAgICAgICR0aXAucmVtb3ZlQ2xhc3ModGFiQ2xhc3Muam9pbignJykpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2hhbmRsZVBvcHBlclBsYWNlbWVudENoYW5nZSA9IGZ1bmN0aW9uIF9oYW5kbGVQb3BwZXJQbGFjZW1lbnRDaGFuZ2UocG9wcGVyRGF0YSkge1xuICAgICAgICB2YXIgcG9wcGVySW5zdGFuY2UgPSBwb3BwZXJEYXRhLmluc3RhbmNlO1xuICAgICAgICB0aGlzLnRpcCA9IHBvcHBlckluc3RhbmNlLnBvcHBlcjtcblxuICAgICAgICB0aGlzLl9jbGVhblRpcENsYXNzKCk7XG5cbiAgICAgICAgdGhpcy5hZGRBdHRhY2htZW50Q2xhc3ModGhpcy5fZ2V0QXR0YWNobWVudChwb3BwZXJEYXRhLnBsYWNlbWVudCkpO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9maXhUcmFuc2l0aW9uID0gZnVuY3Rpb24gX2ZpeFRyYW5zaXRpb24oKSB7XG4gICAgICAgIHZhciB0aXAgPSB0aGlzLmdldFRpcEVsZW1lbnQoKTtcbiAgICAgICAgdmFyIGluaXRDb25maWdBbmltYXRpb24gPSB0aGlzLmNvbmZpZy5hbmltYXRpb247XG5cbiAgICAgICAgaWYgKHRpcC5nZXRBdHRyaWJ1dGUoJ3gtcGxhY2VtZW50JykgIT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkJCQxKHRpcCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkZBREUpO1xuICAgICAgICB0aGlzLmNvbmZpZy5hbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICAgIHRoaXMuc2hvdygpO1xuICAgICAgICB0aGlzLmNvbmZpZy5hbmltYXRpb24gPSBpbml0Q29uZmlnQW5pbWF0aW9uO1xuICAgICAgfTsgLy8gU3RhdGljXG5cblxuICAgICAgVG9vbHRpcC5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSAkJCQxKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgICAgdmFyIF9jb25maWcgPSB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyAmJiBjb25maWc7XG5cbiAgICAgICAgICBpZiAoIWRhdGEgJiYgL2Rpc3Bvc2V8aGlkZS8udGVzdChjb25maWcpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICBkYXRhID0gbmV3IFRvb2x0aXAodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgICAkJCQxKHRoaXMpLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgX2NyZWF0ZUNsYXNzKFRvb2x0aXAsIG51bGwsIFt7XG4gICAgICAgIGtleTogXCJWRVJTSU9OXCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBWRVJTSU9OO1xuICAgICAgICB9XG4gICAgICB9LCB7XG4gICAgICAgIGtleTogXCJEZWZhdWx0XCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBEZWZhdWx0O1xuICAgICAgICB9XG4gICAgICB9LCB7XG4gICAgICAgIGtleTogXCJOQU1FXCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBOQU1FO1xuICAgICAgICB9XG4gICAgICB9LCB7XG4gICAgICAgIGtleTogXCJEQVRBX0tFWVwiLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gREFUQV9LRVk7XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcIkV2ZW50XCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBFdmVudDtcbiAgICAgICAgfVxuICAgICAgfSwge1xuICAgICAgICBrZXk6IFwiRVZFTlRfS0VZXCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBFVkVOVF9LRVk7XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcIkRlZmF1bHRUeXBlXCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBEZWZhdWx0VHlwZTtcbiAgICAgICAgfVxuICAgICAgfV0pO1xuXG4gICAgICByZXR1cm4gVG9vbHRpcDtcbiAgICB9KCk7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogalF1ZXJ5XG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cblxuICAgICQkJDEuZm5bTkFNRV0gPSBUb29sdGlwLl9qUXVlcnlJbnRlcmZhY2U7XG4gICAgJCQkMS5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IFRvb2x0aXA7XG5cbiAgICAkJCQxLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkJCQxLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgICAgcmV0dXJuIFRvb2x0aXAuX2pRdWVyeUludGVyZmFjZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFRvb2x0aXA7XG4gIH0oJCwgUG9wcGVyKTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQm9vdHN0cmFwICh2NC4xLjMpOiBwb3BvdmVyLmpzXG4gICAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBQb3BvdmVyID0gZnVuY3Rpb24gKCQkJDEpIHtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDb25zdGFudHNcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cbiAgICB2YXIgTkFNRSA9ICdwb3BvdmVyJztcbiAgICB2YXIgVkVSU0lPTiA9ICc0LjEuMyc7XG4gICAgdmFyIERBVEFfS0VZID0gJ2JzLnBvcG92ZXInO1xuICAgIHZhciBFVkVOVF9LRVkgPSBcIi5cIiArIERBVEFfS0VZO1xuICAgIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkJCQxLmZuW05BTUVdO1xuICAgIHZhciBDTEFTU19QUkVGSVggPSAnYnMtcG9wb3Zlcic7XG4gICAgdmFyIEJTQ0xTX1BSRUZJWF9SRUdFWCA9IG5ldyBSZWdFeHAoXCIoXnxcXFxccylcIiArIENMQVNTX1BSRUZJWCArIFwiXFxcXFMrXCIsICdnJyk7XG5cbiAgICB2YXIgRGVmYXVsdCA9IF9vYmplY3RTcHJlYWQoe30sIFRvb2x0aXAuRGVmYXVsdCwge1xuICAgICAgcGxhY2VtZW50OiAncmlnaHQnLFxuICAgICAgdHJpZ2dlcjogJ2NsaWNrJyxcbiAgICAgIGNvbnRlbnQ6ICcnLFxuICAgICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwicG9wb3ZlclwiIHJvbGU9XCJ0b29sdGlwXCI+JyArICc8ZGl2IGNsYXNzPVwiYXJyb3dcIj48L2Rpdj4nICsgJzxoMyBjbGFzcz1cInBvcG92ZXItaGVhZGVyXCI+PC9oMz4nICsgJzxkaXYgY2xhc3M9XCJwb3BvdmVyLWJvZHlcIj48L2Rpdj48L2Rpdj4nXG4gICAgfSk7XG5cbiAgICB2YXIgRGVmYXVsdFR5cGUgPSBfb2JqZWN0U3ByZWFkKHt9LCBUb29sdGlwLkRlZmF1bHRUeXBlLCB7XG4gICAgICBjb250ZW50OiAnKHN0cmluZ3xlbGVtZW50fGZ1bmN0aW9uKSdcbiAgICB9KTtcblxuICAgIHZhciBDbGFzc05hbWUgPSB7XG4gICAgICBGQURFOiAnZmFkZScsXG4gICAgICBTSE9XOiAnc2hvdydcbiAgICB9O1xuICAgIHZhciBTZWxlY3RvciA9IHtcbiAgICAgIFRJVExFOiAnLnBvcG92ZXItaGVhZGVyJyxcbiAgICAgIENPTlRFTlQ6ICcucG9wb3Zlci1ib2R5J1xuICAgIH07XG4gICAgdmFyIEV2ZW50ID0ge1xuICAgICAgSElERTogXCJoaWRlXCIgKyBFVkVOVF9LRVksXG4gICAgICBISURERU46IFwiaGlkZGVuXCIgKyBFVkVOVF9LRVksXG4gICAgICBTSE9XOiBcInNob3dcIiArIEVWRU5UX0tFWSxcbiAgICAgIFNIT1dOOiBcInNob3duXCIgKyBFVkVOVF9LRVksXG4gICAgICBJTlNFUlRFRDogXCJpbnNlcnRlZFwiICsgRVZFTlRfS0VZLFxuICAgICAgQ0xJQ0s6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSxcbiAgICAgIEZPQ1VTSU46IFwiZm9jdXNpblwiICsgRVZFTlRfS0VZLFxuICAgICAgRk9DVVNPVVQ6IFwiZm9jdXNvdXRcIiArIEVWRU5UX0tFWSxcbiAgICAgIE1PVVNFRU5URVI6IFwibW91c2VlbnRlclwiICsgRVZFTlRfS0VZLFxuICAgICAgTU9VU0VMRUFWRTogXCJtb3VzZWxlYXZlXCIgKyBFVkVOVF9LRVlcbiAgICAgIC8qKlxuICAgICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAqL1xuXG4gICAgfTtcblxuICAgIHZhciBQb3BvdmVyID1cbiAgICAvKiNfX1BVUkVfXyovXG4gICAgZnVuY3Rpb24gKF9Ub29sdGlwKSB7XG4gICAgICBfaW5oZXJpdHNMb29zZShQb3BvdmVyLCBfVG9vbHRpcCk7XG5cbiAgICAgIGZ1bmN0aW9uIFBvcG92ZXIoKSB7XG4gICAgICAgIHJldHVybiBfVG9vbHRpcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gICAgICB9XG5cbiAgICAgIHZhciBfcHJvdG8gPSBQb3BvdmVyLnByb3RvdHlwZTtcblxuICAgICAgLy8gT3ZlcnJpZGVzXG4gICAgICBfcHJvdG8uaXNXaXRoQ29udGVudCA9IGZ1bmN0aW9uIGlzV2l0aENvbnRlbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFRpdGxlKCkgfHwgdGhpcy5fZ2V0Q29udGVudCgpO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmFkZEF0dGFjaG1lbnRDbGFzcyA9IGZ1bmN0aW9uIGFkZEF0dGFjaG1lbnRDbGFzcyhhdHRhY2htZW50KSB7XG4gICAgICAgICQkJDEodGhpcy5nZXRUaXBFbGVtZW50KCkpLmFkZENsYXNzKENMQVNTX1BSRUZJWCArIFwiLVwiICsgYXR0YWNobWVudCk7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uZ2V0VGlwRWxlbWVudCA9IGZ1bmN0aW9uIGdldFRpcEVsZW1lbnQoKSB7XG4gICAgICAgIHRoaXMudGlwID0gdGhpcy50aXAgfHwgJCQkMSh0aGlzLmNvbmZpZy50ZW1wbGF0ZSlbMF07XG4gICAgICAgIHJldHVybiB0aGlzLnRpcDtcbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5zZXRDb250ZW50ID0gZnVuY3Rpb24gc2V0Q29udGVudCgpIHtcbiAgICAgICAgdmFyICR0aXAgPSAkJCQxKHRoaXMuZ2V0VGlwRWxlbWVudCgpKTsgLy8gV2UgdXNlIGFwcGVuZCBmb3IgaHRtbCBvYmplY3RzIHRvIG1haW50YWluIGpzIGV2ZW50c1xuXG4gICAgICAgIHRoaXMuc2V0RWxlbWVudENvbnRlbnQoJHRpcC5maW5kKFNlbGVjdG9yLlRJVExFKSwgdGhpcy5nZXRUaXRsZSgpKTtcblxuICAgICAgICB2YXIgY29udGVudCA9IHRoaXMuX2dldENvbnRlbnQoKTtcblxuICAgICAgICBpZiAodHlwZW9mIGNvbnRlbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBjb250ZW50ID0gY29udGVudC5jYWxsKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldEVsZW1lbnRDb250ZW50KCR0aXAuZmluZChTZWxlY3Rvci5DT05URU5UKSwgY29udGVudCk7XG4gICAgICAgICR0aXAucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkZBREUgKyBcIiBcIiArIENsYXNzTmFtZS5TSE9XKTtcbiAgICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgICBfcHJvdG8uX2dldENvbnRlbnQgPSBmdW5jdGlvbiBfZ2V0Q29udGVudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtY29udGVudCcpIHx8IHRoaXMuY29uZmlnLmNvbnRlbnQ7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2NsZWFuVGlwQ2xhc3MgPSBmdW5jdGlvbiBfY2xlYW5UaXBDbGFzcygpIHtcbiAgICAgICAgdmFyICR0aXAgPSAkJCQxKHRoaXMuZ2V0VGlwRWxlbWVudCgpKTtcbiAgICAgICAgdmFyIHRhYkNsYXNzID0gJHRpcC5hdHRyKCdjbGFzcycpLm1hdGNoKEJTQ0xTX1BSRUZJWF9SRUdFWCk7XG5cbiAgICAgICAgaWYgKHRhYkNsYXNzICE9PSBudWxsICYmIHRhYkNsYXNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAkdGlwLnJlbW92ZUNsYXNzKHRhYkNsYXNzLmpvaW4oJycpKTtcbiAgICAgICAgfVxuICAgICAgfTsgLy8gU3RhdGljXG5cblxuICAgICAgUG9wb3Zlci5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSAkJCQxKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgICAgdmFyIF9jb25maWcgPSB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyA/IGNvbmZpZyA6IG51bGw7XG5cbiAgICAgICAgICBpZiAoIWRhdGEgJiYgL2Rlc3Ryb3l8aGlkZS8udGVzdChjb25maWcpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICBkYXRhID0gbmV3IFBvcG92ZXIodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgICAkJCQxKHRoaXMpLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgX2NyZWF0ZUNsYXNzKFBvcG92ZXIsIG51bGwsIFt7XG4gICAgICAgIGtleTogXCJWRVJTSU9OXCIsXG4gICAgICAgIC8vIEdldHRlcnNcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcIk5BTUVcIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIE5BTUU7XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcIkRBVEFfS0VZXCIsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBEQVRBX0tFWTtcbiAgICAgICAgfVxuICAgICAgfSwge1xuICAgICAgICBrZXk6IFwiRXZlbnRcIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIEV2ZW50O1xuICAgICAgICB9XG4gICAgICB9LCB7XG4gICAgICAgIGtleTogXCJFVkVOVF9LRVlcIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIEVWRU5UX0tFWTtcbiAgICAgICAgfVxuICAgICAgfSwge1xuICAgICAgICBrZXk6IFwiRGVmYXVsdFR5cGVcIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIERlZmF1bHRUeXBlO1xuICAgICAgICB9XG4gICAgICB9XSk7XG5cbiAgICAgIHJldHVybiBQb3BvdmVyO1xuICAgIH0oVG9vbHRpcCk7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogalF1ZXJ5XG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cblxuICAgICQkJDEuZm5bTkFNRV0gPSBQb3BvdmVyLl9qUXVlcnlJbnRlcmZhY2U7XG4gICAgJCQkMS5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IFBvcG92ZXI7XG5cbiAgICAkJCQxLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAkJCQxLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgICAgcmV0dXJuIFBvcG92ZXIuX2pRdWVyeUludGVyZmFjZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFBvcG92ZXI7XG4gIH0oJCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIEJvb3RzdHJhcCAodjQuMS4zKTogc2Nyb2xsc3B5LmpzXG4gICAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBTY3JvbGxTcHkgPSBmdW5jdGlvbiAoJCQkMSkge1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIENvbnN0YW50c1xuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuICAgIHZhciBOQU1FID0gJ3Njcm9sbHNweSc7XG4gICAgdmFyIFZFUlNJT04gPSAnNC4xLjMnO1xuICAgIHZhciBEQVRBX0tFWSA9ICdicy5zY3JvbGxzcHknO1xuICAgIHZhciBFVkVOVF9LRVkgPSBcIi5cIiArIERBVEFfS0VZO1xuICAgIHZhciBEQVRBX0FQSV9LRVkgPSAnLmRhdGEtYXBpJztcbiAgICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJCQkMS5mbltOQU1FXTtcbiAgICB2YXIgRGVmYXVsdCA9IHtcbiAgICAgIG9mZnNldDogMTAsXG4gICAgICBtZXRob2Q6ICdhdXRvJyxcbiAgICAgIHRhcmdldDogJydcbiAgICB9O1xuICAgIHZhciBEZWZhdWx0VHlwZSA9IHtcbiAgICAgIG9mZnNldDogJ251bWJlcicsXG4gICAgICBtZXRob2Q6ICdzdHJpbmcnLFxuICAgICAgdGFyZ2V0OiAnKHN0cmluZ3xlbGVtZW50KSdcbiAgICB9O1xuICAgIHZhciBFdmVudCA9IHtcbiAgICAgIEFDVElWQVRFOiBcImFjdGl2YXRlXCIgKyBFVkVOVF9LRVksXG4gICAgICBTQ1JPTEw6IFwic2Nyb2xsXCIgKyBFVkVOVF9LRVksXG4gICAgICBMT0FEX0RBVEFfQVBJOiBcImxvYWRcIiArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWVxuICAgIH07XG4gICAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICAgIERST1BET1dOX0lURU06ICdkcm9wZG93bi1pdGVtJyxcbiAgICAgIERST1BET1dOX01FTlU6ICdkcm9wZG93bi1tZW51JyxcbiAgICAgIEFDVElWRTogJ2FjdGl2ZSdcbiAgICB9O1xuICAgIHZhciBTZWxlY3RvciA9IHtcbiAgICAgIERBVEFfU1BZOiAnW2RhdGEtc3B5PVwic2Nyb2xsXCJdJyxcbiAgICAgIEFDVElWRTogJy5hY3RpdmUnLFxuICAgICAgTkFWX0xJU1RfR1JPVVA6ICcubmF2LCAubGlzdC1ncm91cCcsXG4gICAgICBOQVZfTElOS1M6ICcubmF2LWxpbmsnLFxuICAgICAgTkFWX0lURU1TOiAnLm5hdi1pdGVtJyxcbiAgICAgIExJU1RfSVRFTVM6ICcubGlzdC1ncm91cC1pdGVtJyxcbiAgICAgIERST1BET1dOOiAnLmRyb3Bkb3duJyxcbiAgICAgIERST1BET1dOX0lURU1TOiAnLmRyb3Bkb3duLWl0ZW0nLFxuICAgICAgRFJPUERPV05fVE9HR0xFOiAnLmRyb3Bkb3duLXRvZ2dsZSdcbiAgICB9O1xuICAgIHZhciBPZmZzZXRNZXRob2QgPSB7XG4gICAgICBPRkZTRVQ6ICdvZmZzZXQnLFxuICAgICAgUE9TSVRJT046ICdwb3NpdGlvbidcbiAgICAgIC8qKlxuICAgICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAqL1xuXG4gICAgfTtcblxuICAgIHZhciBTY3JvbGxTcHkgPVxuICAgIC8qI19fUFVSRV9fKi9cbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBmdW5jdGlvbiBTY3JvbGxTcHkoZWxlbWVudCwgY29uZmlnKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgIHRoaXMuX3Njcm9sbEVsZW1lbnQgPSBlbGVtZW50LnRhZ05hbWUgPT09ICdCT0RZJyA/IHdpbmRvdyA6IGVsZW1lbnQ7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHRoaXMuX2dldENvbmZpZyhjb25maWcpO1xuICAgICAgICB0aGlzLl9zZWxlY3RvciA9IHRoaXMuX2NvbmZpZy50YXJnZXQgKyBcIiBcIiArIFNlbGVjdG9yLk5BVl9MSU5LUyArIFwiLFwiICsgKHRoaXMuX2NvbmZpZy50YXJnZXQgKyBcIiBcIiArIFNlbGVjdG9yLkxJU1RfSVRFTVMgKyBcIixcIikgKyAodGhpcy5fY29uZmlnLnRhcmdldCArIFwiIFwiICsgU2VsZWN0b3IuRFJPUERPV05fSVRFTVMpO1xuICAgICAgICB0aGlzLl9vZmZzZXRzID0gW107XG4gICAgICAgIHRoaXMuX3RhcmdldHMgPSBbXTtcbiAgICAgICAgdGhpcy5fYWN0aXZlVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gMDtcbiAgICAgICAgJCQkMSh0aGlzLl9zY3JvbGxFbGVtZW50KS5vbihFdmVudC5TQ1JPTEwsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpcy5fcHJvY2VzcyhldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcblxuICAgICAgICB0aGlzLl9wcm9jZXNzKCk7XG4gICAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgICB2YXIgX3Byb3RvID0gU2Nyb2xsU3B5LnByb3RvdHlwZTtcblxuICAgICAgLy8gUHVibGljXG4gICAgICBfcHJvdG8ucmVmcmVzaCA9IGZ1bmN0aW9uIHJlZnJlc2goKSB7XG4gICAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICAgIHZhciBhdXRvTWV0aG9kID0gdGhpcy5fc2Nyb2xsRWxlbWVudCA9PT0gdGhpcy5fc2Nyb2xsRWxlbWVudC53aW5kb3cgPyBPZmZzZXRNZXRob2QuT0ZGU0VUIDogT2Zmc2V0TWV0aG9kLlBPU0lUSU9OO1xuICAgICAgICB2YXIgb2Zmc2V0TWV0aG9kID0gdGhpcy5fY29uZmlnLm1ldGhvZCA9PT0gJ2F1dG8nID8gYXV0b01ldGhvZCA6IHRoaXMuX2NvbmZpZy5tZXRob2Q7XG4gICAgICAgIHZhciBvZmZzZXRCYXNlID0gb2Zmc2V0TWV0aG9kID09PSBPZmZzZXRNZXRob2QuUE9TSVRJT04gPyB0aGlzLl9nZXRTY3JvbGxUb3AoKSA6IDA7XG4gICAgICAgIHRoaXMuX29mZnNldHMgPSBbXTtcbiAgICAgICAgdGhpcy5fdGFyZ2V0cyA9IFtdO1xuICAgICAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSB0aGlzLl9nZXRTY3JvbGxIZWlnaHQoKTtcbiAgICAgICAgdmFyIHRhcmdldHMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwodGhpcy5fc2VsZWN0b3IpKTtcbiAgICAgICAgdGFyZ2V0cy5tYXAoZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICB2YXIgdGFyZ2V0O1xuICAgICAgICAgIHZhciB0YXJnZXRTZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudChlbGVtZW50KTtcblxuICAgICAgICAgIGlmICh0YXJnZXRTZWxlY3Rvcikge1xuICAgICAgICAgICAgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXRTZWxlY3Rvcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgICAgdmFyIHRhcmdldEJDUiA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICAgICAgaWYgKHRhcmdldEJDUi53aWR0aCB8fCB0YXJnZXRCQ1IuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgIC8vIFRPRE8gKGZhdCk6IHJlbW92ZSBza2V0Y2ggcmVsaWFuY2Ugb24galF1ZXJ5IHBvc2l0aW9uL29mZnNldFxuICAgICAgICAgICAgICByZXR1cm4gWyQkJDEodGFyZ2V0KVtvZmZzZXRNZXRob2RdKCkudG9wICsgb2Zmc2V0QmFzZSwgdGFyZ2V0U2VsZWN0b3JdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgfSkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgIHJldHVybiBhWzBdIC0gYlswXTtcbiAgICAgICAgfSkuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgIF90aGlzMi5fb2Zmc2V0cy5wdXNoKGl0ZW1bMF0pO1xuXG4gICAgICAgICAgX3RoaXMyLl90YXJnZXRzLnB1c2goaXRlbVsxXSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgICAkJCQxLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgICAkJCQxKHRoaXMuX3Njcm9sbEVsZW1lbnQpLm9mZihFVkVOVF9LRVkpO1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fc2Nyb2xsRWxlbWVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IG51bGw7XG4gICAgICAgIHRoaXMuX3NlbGVjdG9yID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb2Zmc2V0cyA9IG51bGw7XG4gICAgICAgIHRoaXMuX3RhcmdldHMgPSBudWxsO1xuICAgICAgICB0aGlzLl9hY3RpdmVUYXJnZXQgPSBudWxsO1xuICAgICAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSBudWxsO1xuICAgICAgfTsgLy8gUHJpdmF0ZVxuXG5cbiAgICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgICAgY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLnRhcmdldCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB2YXIgaWQgPSAkJCQxKGNvbmZpZy50YXJnZXQpLmF0dHIoJ2lkJyk7XG5cbiAgICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICBpZCA9IFV0aWwuZ2V0VUlEKE5BTUUpO1xuICAgICAgICAgICAgJCQkMShjb25maWcudGFyZ2V0KS5hdHRyKCdpZCcsIGlkKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25maWcudGFyZ2V0ID0gXCIjXCIgKyBpZDtcbiAgICAgICAgfVxuXG4gICAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUsIGNvbmZpZywgRGVmYXVsdFR5cGUpO1xuICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9nZXRTY3JvbGxUb3AgPSBmdW5jdGlvbiBfZ2V0U2Nyb2xsVG9wKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsRWxlbWVudCA9PT0gd2luZG93ID8gdGhpcy5fc2Nyb2xsRWxlbWVudC5wYWdlWU9mZnNldCA6IHRoaXMuX3Njcm9sbEVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9nZXRTY3JvbGxIZWlnaHQgPSBmdW5jdGlvbiBfZ2V0U2Nyb2xsSGVpZ2h0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsRWxlbWVudC5zY3JvbGxIZWlnaHQgfHwgTWF0aC5tYXgoZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQsIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQpO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9nZXRPZmZzZXRIZWlnaHQgPSBmdW5jdGlvbiBfZ2V0T2Zmc2V0SGVpZ2h0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsRWxlbWVudCA9PT0gd2luZG93ID8gd2luZG93LmlubmVySGVpZ2h0IDogdGhpcy5fc2Nyb2xsRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX3Byb2Nlc3MgPSBmdW5jdGlvbiBfcHJvY2VzcygpIHtcbiAgICAgICAgdmFyIHNjcm9sbFRvcCA9IHRoaXMuX2dldFNjcm9sbFRvcCgpICsgdGhpcy5fY29uZmlnLm9mZnNldDtcblxuICAgICAgICB2YXIgc2Nyb2xsSGVpZ2h0ID0gdGhpcy5fZ2V0U2Nyb2xsSGVpZ2h0KCk7XG5cbiAgICAgICAgdmFyIG1heFNjcm9sbCA9IHRoaXMuX2NvbmZpZy5vZmZzZXQgKyBzY3JvbGxIZWlnaHQgLSB0aGlzLl9nZXRPZmZzZXRIZWlnaHQoKTtcblxuICAgICAgICBpZiAodGhpcy5fc2Nyb2xsSGVpZ2h0ICE9PSBzY3JvbGxIZWlnaHQpIHtcbiAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzY3JvbGxUb3AgPj0gbWF4U2Nyb2xsKSB7XG4gICAgICAgICAgdmFyIHRhcmdldCA9IHRoaXMuX3RhcmdldHNbdGhpcy5fdGFyZ2V0cy5sZW5ndGggLSAxXTtcblxuICAgICAgICAgIGlmICh0aGlzLl9hY3RpdmVUYXJnZXQgIT09IHRhcmdldCkge1xuICAgICAgICAgICAgdGhpcy5fYWN0aXZhdGUodGFyZ2V0KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYWN0aXZlVGFyZ2V0ICYmIHNjcm9sbFRvcCA8IHRoaXMuX29mZnNldHNbMF0gJiYgdGhpcy5fb2Zmc2V0c1swXSA+IDApIHtcbiAgICAgICAgICB0aGlzLl9hY3RpdmVUYXJnZXQgPSBudWxsO1xuXG4gICAgICAgICAgdGhpcy5fY2xlYXIoKTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvZmZzZXRMZW5ndGggPSB0aGlzLl9vZmZzZXRzLmxlbmd0aDtcblxuICAgICAgICBmb3IgKHZhciBpID0gb2Zmc2V0TGVuZ3RoOyBpLS07KSB7XG4gICAgICAgICAgdmFyIGlzQWN0aXZlVGFyZ2V0ID0gdGhpcy5fYWN0aXZlVGFyZ2V0ICE9PSB0aGlzLl90YXJnZXRzW2ldICYmIHNjcm9sbFRvcCA+PSB0aGlzLl9vZmZzZXRzW2ldICYmICh0eXBlb2YgdGhpcy5fb2Zmc2V0c1tpICsgMV0gPT09ICd1bmRlZmluZWQnIHx8IHNjcm9sbFRvcCA8IHRoaXMuX29mZnNldHNbaSArIDFdKTtcblxuICAgICAgICAgIGlmIChpc0FjdGl2ZVRhcmdldCkge1xuICAgICAgICAgICAgdGhpcy5fYWN0aXZhdGUodGhpcy5fdGFyZ2V0c1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uX2FjdGl2YXRlID0gZnVuY3Rpb24gX2FjdGl2YXRlKHRhcmdldCkge1xuICAgICAgICB0aGlzLl9hY3RpdmVUYXJnZXQgPSB0YXJnZXQ7XG5cbiAgICAgICAgdGhpcy5fY2xlYXIoKTtcblxuICAgICAgICB2YXIgcXVlcmllcyA9IHRoaXMuX3NlbGVjdG9yLnNwbGl0KCcsJyk7IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBhcnJvdy1ib2R5LXN0eWxlXG5cblxuICAgICAgICBxdWVyaWVzID0gcXVlcmllcy5tYXAoZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgICAgcmV0dXJuIHNlbGVjdG9yICsgXCJbZGF0YS10YXJnZXQ9XFxcIlwiICsgdGFyZ2V0ICsgXCJcXFwiXSxcIiArIChzZWxlY3RvciArIFwiW2hyZWY9XFxcIlwiICsgdGFyZ2V0ICsgXCJcXFwiXVwiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciAkbGluayA9ICQkJDEoW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHF1ZXJpZXMuam9pbignLCcpKSkpO1xuXG4gICAgICAgIGlmICgkbGluay5oYXNDbGFzcyhDbGFzc05hbWUuRFJPUERPV05fSVRFTSkpIHtcbiAgICAgICAgICAkbGluay5jbG9zZXN0KFNlbGVjdG9yLkRST1BET1dOKS5maW5kKFNlbGVjdG9yLkRST1BET1dOX1RPR0dMRSkuYWRkQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG4gICAgICAgICAgJGxpbmsuYWRkQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gU2V0IHRyaWdnZXJlZCBsaW5rIGFzIGFjdGl2ZVxuICAgICAgICAgICRsaW5rLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpOyAvLyBTZXQgdHJpZ2dlcmVkIGxpbmtzIHBhcmVudHMgYXMgYWN0aXZlXG4gICAgICAgICAgLy8gV2l0aCBib3RoIDx1bD4gYW5kIDxuYXY+IG1hcmt1cCBhIHBhcmVudCBpcyB0aGUgcHJldmlvdXMgc2libGluZyBvZiBhbnkgbmF2IGFuY2VzdG9yXG5cbiAgICAgICAgICAkbGluay5wYXJlbnRzKFNlbGVjdG9yLk5BVl9MSVNUX0dST1VQKS5wcmV2KFNlbGVjdG9yLk5BVl9MSU5LUyArIFwiLCBcIiArIFNlbGVjdG9yLkxJU1RfSVRFTVMpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpOyAvLyBIYW5kbGUgc3BlY2lhbCBjYXNlIHdoZW4gLm5hdi1saW5rIGlzIGluc2lkZSAubmF2LWl0ZW1cblxuICAgICAgICAgICRsaW5rLnBhcmVudHMoU2VsZWN0b3IuTkFWX0xJU1RfR1JPVVApLnByZXYoU2VsZWN0b3IuTkFWX0lURU1TKS5jaGlsZHJlbihTZWxlY3Rvci5OQVZfTElOS1MpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCQkMSh0aGlzLl9zY3JvbGxFbGVtZW50KS50cmlnZ2VyKEV2ZW50LkFDVElWQVRFLCB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogdGFyZ2V0XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgX3Byb3RvLl9jbGVhciA9IGZ1bmN0aW9uIF9jbGVhcigpIHtcbiAgICAgICAgdmFyIG5vZGVzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHRoaXMuX3NlbGVjdG9yKSk7XG4gICAgICAgICQkJDEobm9kZXMpLmZpbHRlcihTZWxlY3Rvci5BQ1RJVkUpLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgfTsgLy8gU3RhdGljXG5cblxuICAgICAgU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9ICQkJDEodGhpcykuZGF0YShEQVRBX0tFWSk7XG5cbiAgICAgICAgICB2YXIgX2NvbmZpZyA9IHR5cGVvZiBjb25maWcgPT09ICdvYmplY3QnICYmIGNvbmZpZztcblxuICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgZGF0YSA9IG5ldyBTY3JvbGxTcHkodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgICAkJCQxKHRoaXMpLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgX2NyZWF0ZUNsYXNzKFNjcm9sbFNweSwgbnVsbCwgW3tcbiAgICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1dKTtcblxuICAgICAgcmV0dXJuIFNjcm9sbFNweTtcbiAgICB9KCk7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogRGF0YSBBcGkgaW1wbGVtZW50YXRpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuXG4gICAgJCQkMSh3aW5kb3cpLm9uKEV2ZW50LkxPQURfREFUQV9BUEksIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBzY3JvbGxTcHlzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yLkRBVEFfU1BZKSk7XG4gICAgICB2YXIgc2Nyb2xsU3B5c0xlbmd0aCA9IHNjcm9sbFNweXMubGVuZ3RoO1xuXG4gICAgICBmb3IgKHZhciBpID0gc2Nyb2xsU3B5c0xlbmd0aDsgaS0tOykge1xuICAgICAgICB2YXIgJHNweSA9ICQkJDEoc2Nyb2xsU3B5c1tpXSk7XG5cbiAgICAgICAgU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkc3B5LCAkc3B5LmRhdGEoKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogalF1ZXJ5XG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgICAkJCQxLmZuW05BTUVdID0gU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2U7XG4gICAgJCQkMS5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IFNjcm9sbFNweTtcblxuICAgICQkJDEuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICQkJDEuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgICByZXR1cm4gU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2U7XG4gICAgfTtcblxuICAgIHJldHVybiBTY3JvbGxTcHk7XG4gIH0oJCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIEJvb3RzdHJhcCAodjQuMS4zKTogdGFiLmpzXG4gICAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBUYWIgPSBmdW5jdGlvbiAoJCQkMSkge1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIENvbnN0YW50c1xuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuICAgIHZhciBOQU1FID0gJ3RhYic7XG4gICAgdmFyIFZFUlNJT04gPSAnNC4xLjMnO1xuICAgIHZhciBEQVRBX0tFWSA9ICdicy50YWInO1xuICAgIHZhciBFVkVOVF9LRVkgPSBcIi5cIiArIERBVEFfS0VZO1xuICAgIHZhciBEQVRBX0FQSV9LRVkgPSAnLmRhdGEtYXBpJztcbiAgICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJCQkMS5mbltOQU1FXTtcbiAgICB2YXIgRXZlbnQgPSB7XG4gICAgICBISURFOiBcImhpZGVcIiArIEVWRU5UX0tFWSxcbiAgICAgIEhJRERFTjogXCJoaWRkZW5cIiArIEVWRU5UX0tFWSxcbiAgICAgIFNIT1c6IFwic2hvd1wiICsgRVZFTlRfS0VZLFxuICAgICAgU0hPV046IFwic2hvd25cIiArIEVWRU5UX0tFWSxcbiAgICAgIENMSUNLX0RBVEFfQVBJOiBcImNsaWNrXCIgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVlcbiAgICB9O1xuICAgIHZhciBDbGFzc05hbWUgPSB7XG4gICAgICBEUk9QRE9XTl9NRU5VOiAnZHJvcGRvd24tbWVudScsXG4gICAgICBBQ1RJVkU6ICdhY3RpdmUnLFxuICAgICAgRElTQUJMRUQ6ICdkaXNhYmxlZCcsXG4gICAgICBGQURFOiAnZmFkZScsXG4gICAgICBTSE9XOiAnc2hvdydcbiAgICB9O1xuICAgIHZhciBTZWxlY3RvciA9IHtcbiAgICAgIERST1BET1dOOiAnLmRyb3Bkb3duJyxcbiAgICAgIE5BVl9MSVNUX0dST1VQOiAnLm5hdiwgLmxpc3QtZ3JvdXAnLFxuICAgICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgICBBQ1RJVkVfVUw6ICc+IGxpID4gLmFjdGl2ZScsXG4gICAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cInRhYlwiXSwgW2RhdGEtdG9nZ2xlPVwicGlsbFwiXSwgW2RhdGEtdG9nZ2xlPVwibGlzdFwiXScsXG4gICAgICBEUk9QRE9XTl9UT0dHTEU6ICcuZHJvcGRvd24tdG9nZ2xlJyxcbiAgICAgIERST1BET1dOX0FDVElWRV9DSElMRDogJz4gLmRyb3Bkb3duLW1lbnUgLmFjdGl2ZSdcbiAgICAgIC8qKlxuICAgICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAqL1xuXG4gICAgfTtcblxuICAgIHZhciBUYWIgPVxuICAgIC8qI19fUFVSRV9fKi9cbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBmdW5jdGlvbiBUYWIoZWxlbWVudCkge1xuICAgICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgIH0gLy8gR2V0dGVyc1xuXG5cbiAgICAgIHZhciBfcHJvdG8gPSBUYWIucHJvdG90eXBlO1xuXG4gICAgICAvLyBQdWJsaWNcbiAgICAgIF9wcm90by5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICBpZiAodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlICYmIHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUgJiYgJCQkMSh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuQUNUSVZFKSB8fCAkJCQxKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5ESVNBQkxFRCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGFyZ2V0O1xuICAgICAgICB2YXIgcHJldmlvdXM7XG4gICAgICAgIHZhciBsaXN0RWxlbWVudCA9ICQkJDEodGhpcy5fZWxlbWVudCkuY2xvc2VzdChTZWxlY3Rvci5OQVZfTElTVF9HUk9VUClbMF07XG4gICAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzLl9lbGVtZW50KTtcblxuICAgICAgICBpZiAobGlzdEVsZW1lbnQpIHtcbiAgICAgICAgICB2YXIgaXRlbVNlbGVjdG9yID0gbGlzdEVsZW1lbnQubm9kZU5hbWUgPT09ICdVTCcgPyBTZWxlY3Rvci5BQ1RJVkVfVUwgOiBTZWxlY3Rvci5BQ1RJVkU7XG4gICAgICAgICAgcHJldmlvdXMgPSAkJCQxLm1ha2VBcnJheSgkJCQxKGxpc3RFbGVtZW50KS5maW5kKGl0ZW1TZWxlY3RvcikpO1xuICAgICAgICAgIHByZXZpb3VzID0gcHJldmlvdXNbcHJldmlvdXMubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaGlkZUV2ZW50ID0gJCQkMS5FdmVudChFdmVudC5ISURFLCB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogdGhpcy5fZWxlbWVudFxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHNob3dFdmVudCA9ICQkJDEuRXZlbnQoRXZlbnQuU0hPVywge1xuICAgICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHByZXZpb3VzXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICAgICQkJDEocHJldmlvdXMpLnRyaWdnZXIoaGlkZUV2ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgICQkJDEodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzaG93RXZlbnQpO1xuXG4gICAgICAgIGlmIChzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgfHwgaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hY3RpdmF0ZSh0aGlzLl9lbGVtZW50LCBsaXN0RWxlbWVudCk7XG5cbiAgICAgICAgdmFyIGNvbXBsZXRlID0gZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgICAgdmFyIGhpZGRlbkV2ZW50ID0gJCQkMS5FdmVudChFdmVudC5ISURERU4sIHtcbiAgICAgICAgICAgIHJlbGF0ZWRUYXJnZXQ6IF90aGlzLl9lbGVtZW50XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIHNob3duRXZlbnQgPSAkJCQxLkV2ZW50KEV2ZW50LlNIT1dOLCB7XG4gICAgICAgICAgICByZWxhdGVkVGFyZ2V0OiBwcmV2aW91c1xuICAgICAgICAgIH0pO1xuICAgICAgICAgICQkJDEocHJldmlvdXMpLnRyaWdnZXIoaGlkZGVuRXZlbnQpO1xuICAgICAgICAgICQkJDEoX3RoaXMuX2VsZW1lbnQpLnRyaWdnZXIoc2hvd25FdmVudCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgIHRoaXMuX2FjdGl2YXRlKHRhcmdldCwgdGFyZ2V0LnBhcmVudE5vZGUsIGNvbXBsZXRlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBfcHJvdG8uZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAgICQkJDEucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSk7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgfTsgLy8gUHJpdmF0ZVxuXG5cbiAgICAgIF9wcm90by5fYWN0aXZhdGUgPSBmdW5jdGlvbiBfYWN0aXZhdGUoZWxlbWVudCwgY29udGFpbmVyLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgICB2YXIgYWN0aXZlRWxlbWVudHM7XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lci5ub2RlTmFtZSA9PT0gJ1VMJykge1xuICAgICAgICAgIGFjdGl2ZUVsZW1lbnRzID0gJCQkMShjb250YWluZXIpLmZpbmQoU2VsZWN0b3IuQUNUSVZFX1VMKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhY3RpdmVFbGVtZW50cyA9ICQkJDEoY29udGFpbmVyKS5jaGlsZHJlbihTZWxlY3Rvci5BQ1RJVkUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFjdGl2ZSA9IGFjdGl2ZUVsZW1lbnRzWzBdO1xuICAgICAgICB2YXIgaXNUcmFuc2l0aW9uaW5nID0gY2FsbGJhY2sgJiYgYWN0aXZlICYmICQkJDEoYWN0aXZlKS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSk7XG5cbiAgICAgICAgdmFyIGNvbXBsZXRlID0gZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMi5fdHJhbnNpdGlvbkNvbXBsZXRlKGVsZW1lbnQsIGFjdGl2ZSwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChhY3RpdmUgJiYgaXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQoYWN0aXZlKTtcbiAgICAgICAgICAkJCQxKGFjdGl2ZSkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIF9wcm90by5fdHJhbnNpdGlvbkNvbXBsZXRlID0gZnVuY3Rpb24gX3RyYW5zaXRpb25Db21wbGV0ZShlbGVtZW50LCBhY3RpdmUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgICAkJCQxKGFjdGl2ZSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cgKyBcIiBcIiArIENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICAgIHZhciBkcm9wZG93bkNoaWxkID0gJCQkMShhY3RpdmUucGFyZW50Tm9kZSkuZmluZChTZWxlY3Rvci5EUk9QRE9XTl9BQ1RJVkVfQ0hJTEQpWzBdO1xuXG4gICAgICAgICAgaWYgKGRyb3Bkb3duQ2hpbGQpIHtcbiAgICAgICAgICAgICQkJDEoZHJvcGRvd25DaGlsZCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGFjdGl2ZS5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSA9PT0gJ3RhYicpIHtcbiAgICAgICAgICAgIGFjdGl2ZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgJCQkMShlbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcblxuICAgICAgICBpZiAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSA9PT0gJ3RhYicpIHtcbiAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1zZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgVXRpbC5yZWZsb3coZWxlbWVudCk7XG4gICAgICAgICQkJDEoZWxlbWVudCkuYWRkQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICAgIGlmIChlbGVtZW50LnBhcmVudE5vZGUgJiYgJCQkMShlbGVtZW50LnBhcmVudE5vZGUpLmhhc0NsYXNzKENsYXNzTmFtZS5EUk9QRE9XTl9NRU5VKSkge1xuICAgICAgICAgIHZhciBkcm9wZG93bkVsZW1lbnQgPSAkJCQxKGVsZW1lbnQpLmNsb3Nlc3QoU2VsZWN0b3IuRFJPUERPV04pWzBdO1xuXG4gICAgICAgICAgaWYgKGRyb3Bkb3duRWxlbWVudCkge1xuICAgICAgICAgICAgdmFyIGRyb3Bkb3duVG9nZ2xlTGlzdCA9IFtdLnNsaWNlLmNhbGwoZHJvcGRvd25FbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IuRFJPUERPV05fVE9HR0xFKSk7XG4gICAgICAgICAgICAkJCQxKGRyb3Bkb3duVG9nZ2xlTGlzdCkuYWRkQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICAgIFRhYi5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyICR0aGlzID0gJCQkMSh0aGlzKTtcbiAgICAgICAgICB2YXIgZGF0YSA9ICR0aGlzLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgICBkYXRhID0gbmV3IFRhYih0aGlzKTtcbiAgICAgICAgICAgICR0aGlzLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgX2NyZWF0ZUNsYXNzKFRhYiwgbnVsbCwgW3tcbiAgICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICAgIH1cbiAgICAgIH1dKTtcblxuICAgICAgcmV0dXJuIFRhYjtcbiAgICB9KCk7XG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogRGF0YSBBcGkgaW1wbGVtZW50YXRpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuXG4gICAgJCQkMShkb2N1bWVudCkub24oRXZlbnQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfVE9HR0xFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIFRhYi5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJCQkMSh0aGlzKSwgJ3Nob3cnKTtcbiAgICB9KTtcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBqUXVlcnlcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICAgICQkJDEuZm5bTkFNRV0gPSBUYWIuX2pRdWVyeUludGVyZmFjZTtcbiAgICAkJCQxLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gVGFiO1xuXG4gICAgJCQkMS5mbltOQU1FXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgJCQkMS5mbltOQU1FXSA9IEpRVUVSWV9OT19DT05GTElDVDtcbiAgICAgIHJldHVybiBUYWIuX2pRdWVyeUludGVyZmFjZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFRhYjtcbiAgfSgkKTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQm9vdHN0cmFwICh2NC4xLjMpOiBpbmRleC5qc1xuICAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAoZnVuY3Rpb24gKCQkJDEpIHtcbiAgICBpZiAodHlwZW9mICQkJDEgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb290c3RyYXBcXCdzIEphdmFTY3JpcHQgcmVxdWlyZXMgalF1ZXJ5LiBqUXVlcnkgbXVzdCBiZSBpbmNsdWRlZCBiZWZvcmUgQm9vdHN0cmFwXFwncyBKYXZhU2NyaXB0LicpO1xuICAgIH1cblxuICAgIHZhciB2ZXJzaW9uID0gJCQkMS5mbi5qcXVlcnkuc3BsaXQoJyAnKVswXS5zcGxpdCgnLicpO1xuICAgIHZhciBtaW5NYWpvciA9IDE7XG4gICAgdmFyIGx0TWFqb3IgPSAyO1xuICAgIHZhciBtaW5NaW5vciA9IDk7XG4gICAgdmFyIG1pblBhdGNoID0gMTtcbiAgICB2YXIgbWF4TWFqb3IgPSA0O1xuXG4gICAgaWYgKHZlcnNpb25bMF0gPCBsdE1ham9yICYmIHZlcnNpb25bMV0gPCBtaW5NaW5vciB8fCB2ZXJzaW9uWzBdID09PSBtaW5NYWpvciAmJiB2ZXJzaW9uWzFdID09PSBtaW5NaW5vciAmJiB2ZXJzaW9uWzJdIDwgbWluUGF0Y2ggfHwgdmVyc2lvblswXSA+PSBtYXhNYWpvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdCb290c3RyYXBcXCdzIEphdmFTY3JpcHQgcmVxdWlyZXMgYXQgbGVhc3QgalF1ZXJ5IHYxLjkuMSBidXQgbGVzcyB0aGFuIHY0LjAuMCcpO1xuICAgIH1cbiAgfSkoJCk7XG5cbiAgZXhwb3J0cy5VdGlsID0gVXRpbDtcbiAgZXhwb3J0cy5BbGVydCA9IEFsZXJ0O1xuICBleHBvcnRzLkJ1dHRvbiA9IEJ1dHRvbjtcbiAgZXhwb3J0cy5DYXJvdXNlbCA9IENhcm91c2VsO1xuICBleHBvcnRzLkNvbGxhcHNlID0gQ29sbGFwc2U7XG4gIGV4cG9ydHMuRHJvcGRvd24gPSBEcm9wZG93bjtcbiAgZXhwb3J0cy5Nb2RhbCA9IE1vZGFsO1xuICBleHBvcnRzLlBvcG92ZXIgPSBQb3BvdmVyO1xuICBleHBvcnRzLlNjcm9sbHNweSA9IFNjcm9sbFNweTtcbiAgZXhwb3J0cy5UYWIgPSBUYWI7XG4gIGV4cG9ydHMuVG9vbHRpcCA9IFRvb2x0aXA7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWJvb3RzdHJhcC5qcy5tYXBcblxudmFyIGNvb2tpZSA9IGZ1bmN0aW9uIChrZXksIHZhbHVlLCBvcHRpb25zKSB7XG5cblx0Ly8ga2V5IGFuZCBhdCBsZWFzdCB2YWx1ZSBnaXZlbiwgc2V0IGNvb2tpZS4uLlxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgU3RyaW5nKHZhbHVlKSAhPT0gXCJbb2JqZWN0IE9iamVjdF1cIikge1xuXHRcdG9wdGlvbnMgPSBqUXVlcnkuZXh0ZW5kKHt9LCBvcHRpb25zKTtcblxuXHRcdGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRvcHRpb25zLmV4cGlyZXMgPSAtMTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIG9wdGlvbnMuZXhwaXJlcyA9PT0gJ251bWJlcicpIHtcblx0XHRcdHZhciBkYXlzID0gb3B0aW9ucy5leHBpcmVzLCB0ID0gb3B0aW9ucy5leHBpcmVzID0gbmV3IERhdGUoKTtcblx0XHRcdHQuc2V0RGF0ZSh0LmdldERhdGUoKSArIGRheXMpO1xuXHRcdH1cblxuXHRcdHZhbHVlID0gU3RyaW5nKHZhbHVlKTtcblxuXHRcdHJldHVybiAoZG9jdW1lbnQuY29va2llID0gW1xuXHRcdFx0ZW5jb2RlVVJJQ29tcG9uZW50KGtleSksICc9Jyxcblx0XHRcdG9wdGlvbnMucmF3ID8gdmFsdWUgOiBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpLFxuXHRcdFx0b3B0aW9ucy5leHBpcmVzID8gJzsgZXhwaXJlcz0nICsgb3B0aW9ucy5leHBpcmVzLnRvVVRDU3RyaW5nKCkgOiAnJywgLy8gdXNlIGV4cGlyZXMgYXR0cmlidXRlLCBtYXgtYWdlIGlzIG5vdCBzdXBwb3J0ZWQgYnkgSUVcblx0XHRcdCc7IHBhdGg9LycsXG5cdFx0XHRvcHRpb25zLnNlY3VyZSA/ICc7IHNlY3VyZScgOiAnJ1xuXHRcdF0uam9pbignJykpO1xuXHR9XG5cblx0Ly8ga2V5IGFuZCBwb3NzaWJseSBvcHRpb25zIGdpdmVuLCBnZXQgY29va2llLi4uXG5cdG9wdGlvbnMgPSB2YWx1ZSB8fCB7fTtcblx0dmFyIHJlc3VsdCwgZGVjb2RlID0gb3B0aW9ucy5yYXcgPyBmdW5jdGlvbiAocykgeyByZXR1cm4gczsgfSA6IGRlY29kZVVSSUNvbXBvbmVudDtcblx0cmV0dXJuIChyZXN1bHQgPSBuZXcgUmVnRXhwKCcoPzpefDsgKScgKyBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9KFteO10qKScpLmV4ZWMoZG9jdW1lbnQuY29va2llKSkgPyBkZWNvZGUocmVzdWx0WzFdKSA6IG51bGw7XG59O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gZmFuY3lCb3ggdjMuNS4yXG4vL1xuLy8gTGljZW5zZWQgR1BMdjMgZm9yIG9wZW4gc291cmNlIHVzZVxuLy8gb3IgZmFuY3lCb3ggQ29tbWVyY2lhbCBMaWNlbnNlIGZvciBjb21tZXJjaWFsIHVzZVxuLy9cbi8vIGh0dHA6Ly9mYW5jeWFwcHMuY29tL2ZhbmN5Ym94L1xuLy8gQ29weXJpZ2h0IDIwMTggZmFuY3lBcHBzXG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbih3aW5kb3csIGRvY3VtZW50LCAkLCB1bmRlZmluZWQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0d2luZG93LmNvbnNvbGUgPSB3aW5kb3cuY29uc29sZSB8fCB7XG5cdFx0aW5mbzogZnVuY3Rpb24oc3R1ZmYpIHt9XG5cdH07XG5cblx0Ly8gSWYgdGhlcmUncyBubyBqUXVlcnksIGZhbmN5Qm94IGNhbid0IHdvcmtcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRpZiAoISQpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBDaGVjayBpZiBmYW5jeUJveCBpcyBhbHJlYWR5IGluaXRpYWxpemVkXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRpZiAoJC5mbi5mYW5jeWJveCkge1xuXHRcdGNvbnNvbGUuaW5mbyhcImZhbmN5Qm94IGFscmVhZHkgaW5pdGlhbGl6ZWRcIik7XG5cblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBQcml2YXRlIGRlZmF1bHQgc2V0dGluZ3Ncblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0dmFyIGRlZmF1bHRzID0ge1xuXHRcdC8vIENsb3NlIGV4aXN0aW5nIG1vZGFsc1xuXHRcdC8vIFNldCB0aGlzIHRvIGZhbHNlIGlmIHlvdSBkbyBub3QgbmVlZCB0byBzdGFjayBtdWx0aXBsZSBpbnN0YW5jZXNcblx0XHRjbG9zZUV4aXN0aW5nOiBmYWxzZSxcblxuXHRcdC8vIEVuYWJsZSBpbmZpbml0ZSBnYWxsZXJ5IG5hdmlnYXRpb25cblx0XHRsb29wOiBmYWxzZSxcblxuXHRcdC8vIEhvcml6b250YWwgc3BhY2UgYmV0d2VlbiBzbGlkZXNcblx0XHRndXR0ZXI6IDUwLFxuXG5cdFx0Ly8gRW5hYmxlIGtleWJvYXJkIG5hdmlnYXRpb25cblx0XHRrZXlib2FyZDogdHJ1ZSxcblxuXHRcdC8vIFNob3VsZCBhbGxvdyBjYXB0aW9uIHRvIG92ZXJsYXAgdGhlIGNvbnRlbnRcblx0XHRwcmV2ZW50Q2FwdGlvbk92ZXJsYXA6IHRydWUsXG5cblx0XHQvLyBTaG91bGQgZGlzcGxheSBuYXZpZ2F0aW9uIGFycm93cyBhdCB0aGUgc2NyZWVuIGVkZ2VzXG5cdFx0YXJyb3dzOiB0cnVlLFxuXG5cdFx0Ly8gU2hvdWxkIGRpc3BsYXkgY291bnRlciBhdCB0aGUgdG9wIGxlZnQgY29ybmVyXG5cdFx0aW5mb2JhcjogdHJ1ZSxcblxuXHRcdC8vIFNob3VsZCBkaXNwbGF5IGNsb3NlIGJ1dHRvbiAodXNpbmcgYGJ0blRwbC5zbWFsbEJ0bmAgdGVtcGxhdGUpIG92ZXIgdGhlIGNvbnRlbnRcblx0XHQvLyBDYW4gYmUgdHJ1ZSwgZmFsc2UsIFwiYXV0b1wiXG5cdFx0Ly8gSWYgXCJhdXRvXCIgLSB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgZW5hYmxlZCBmb3IgXCJodG1sXCIsIFwiaW5saW5lXCIgb3IgXCJhamF4XCIgaXRlbXNcblx0XHRzbWFsbEJ0bjogXCJhdXRvXCIsXG5cblx0XHQvLyBTaG91bGQgZGlzcGxheSB0b29sYmFyIChidXR0b25zIGF0IHRoZSB0b3ApXG5cdFx0Ly8gQ2FuIGJlIHRydWUsIGZhbHNlLCBcImF1dG9cIlxuXHRcdC8vIElmIFwiYXV0b1wiIC0gd2lsbCBiZSBhdXRvbWF0aWNhbGx5IGhpZGRlbiBpZiBcInNtYWxsQnRuXCIgaXMgZW5hYmxlZFxuXHRcdHRvb2xiYXI6IFwiYXV0b1wiLFxuXG5cdFx0Ly8gV2hhdCBidXR0b25zIHNob3VsZCBhcHBlYXIgaW4gdGhlIHRvcCByaWdodCBjb3JuZXIuXG5cdFx0Ly8gQnV0dG9ucyB3aWxsIGJlIGNyZWF0ZWQgdXNpbmcgdGVtcGxhdGVzIGZyb20gYGJ0blRwbGAgb3B0aW9uXG5cdFx0Ly8gYW5kIHRoZXkgd2lsbCBiZSBwbGFjZWQgaW50byB0b29sYmFyIChjbGFzcz1cImZhbmN5Ym94LXRvb2xiYXJcImAgZWxlbWVudClcblx0XHRidXR0b25zOiBbXG5cdFx0XHRcInpvb21cIixcblx0XHRcdC8vXCJzaGFyZVwiLFxuXHRcdFx0XCJzbGlkZVNob3dcIixcblx0XHRcdC8vXCJmdWxsU2NyZWVuXCIsXG5cdFx0XHQvL1wiZG93bmxvYWRcIixcblx0XHRcdFwidGh1bWJzXCIsXG5cdFx0XHRcImNsb3NlXCJcblx0XHRdLFxuXG5cdFx0Ly8gRGV0ZWN0IFwiaWRsZVwiIHRpbWUgaW4gc2Vjb25kc1xuXHRcdGlkbGVUaW1lOiAzLFxuXG5cdFx0Ly8gRGlzYWJsZSByaWdodC1jbGljayBhbmQgdXNlIHNpbXBsZSBpbWFnZSBwcm90ZWN0aW9uIGZvciBpbWFnZXNcblx0XHRwcm90ZWN0OiBmYWxzZSxcblxuXHRcdC8vIFNob3J0Y3V0IHRvIG1ha2UgY29udGVudCBcIm1vZGFsXCIgLSBkaXNhYmxlIGtleWJvYXJkIG5hdmlndGlvbiwgaGlkZSBidXR0b25zLCBldGNcblx0XHRtb2RhbDogZmFsc2UsXG5cblx0XHRpbWFnZToge1xuXHRcdFx0Ly8gV2FpdCBmb3IgaW1hZ2VzIHRvIGxvYWQgYmVmb3JlIGRpc3BsYXlpbmdcblx0XHRcdC8vICAgdHJ1ZSAgLSB3YWl0IGZvciBpbWFnZSB0byBsb2FkIGFuZCB0aGVuIGRpc3BsYXk7XG5cdFx0XHQvLyAgIGZhbHNlIC0gZGlzcGxheSB0aHVtYm5haWwgYW5kIGxvYWQgdGhlIGZ1bGwtc2l6ZWQgaW1hZ2Ugb3ZlciB0b3AsXG5cdFx0XHQvLyAgICAgICAgICAgcmVxdWlyZXMgcHJlZGVmaW5lZCBpbWFnZSBkaW1lbnNpb25zIChgZGF0YS13aWR0aGAgYW5kIGBkYXRhLWhlaWdodGAgYXR0cmlidXRlcylcblx0XHRcdHByZWxvYWQ6IGZhbHNlXG5cdFx0fSxcblxuXHRcdGFqYXg6IHtcblx0XHRcdC8vIE9iamVjdCBjb250YWluaW5nIHNldHRpbmdzIGZvciBhamF4IHJlcXVlc3Rcblx0XHRcdHNldHRpbmdzOiB7XG5cdFx0XHRcdC8vIFRoaXMgaGVscHMgdG8gaW5kaWNhdGUgdGhhdCByZXF1ZXN0IGNvbWVzIGZyb20gdGhlIG1vZGFsXG5cdFx0XHRcdC8vIEZlZWwgZnJlZSB0byBjaGFuZ2UgbmFtaW5nXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRmYW5jeWJveDogdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdGlmcmFtZToge1xuXHRcdFx0Ly8gSWZyYW1lIHRlbXBsYXRlXG5cdFx0XHR0cGw6XG5cdFx0XHRcdCc8aWZyYW1lIGlkPVwiZmFuY3lib3gtZnJhbWV7cm5kfVwiIG5hbWU9XCJmYW5jeWJveC1mcmFtZXtybmR9XCIgY2xhc3M9XCJmYW5jeWJveC1pZnJhbWVcIiBhbGxvd2Z1bGxzY3JlZW4gYWxsb3c9XCJhdXRvcGxheTsgZnVsbHNjcmVlblwiIHNyYz1cIlwiPjwvaWZyYW1lPicsXG5cblx0XHRcdC8vIFByZWxvYWQgaWZyYW1lIGJlZm9yZSBkaXNwbGF5aW5nIGl0XG5cdFx0XHQvLyBUaGlzIGFsbG93cyB0byBjYWxjdWxhdGUgaWZyYW1lIGNvbnRlbnQgd2lkdGggYW5kIGhlaWdodFxuXHRcdFx0Ly8gKG5vdGU6IER1ZSB0byBcIlNhbWUgT3JpZ2luIFBvbGljeVwiLCB5b3UgY2FuJ3QgZ2V0IGNyb3NzIGRvbWFpbiBkYXRhKS5cblx0XHRcdHByZWxvYWQ6IHRydWUsXG5cblx0XHRcdC8vIEN1c3RvbSBDU1Mgc3R5bGluZyBmb3IgaWZyYW1lIHdyYXBwaW5nIGVsZW1lbnRcblx0XHRcdC8vIFlvdSBjYW4gdXNlIHRoaXMgdG8gc2V0IGN1c3RvbSBpZnJhbWUgZGltZW5zaW9uc1xuXHRcdFx0Y3NzOiB7fSxcblxuXHRcdFx0Ly8gSWZyYW1lIHRhZyBhdHRyaWJ1dGVzXG5cdFx0XHRhdHRyOiB7XG5cdFx0XHRcdHNjcm9sbGluZzogXCJhdXRvXCJcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gRm9yIEhUTUw1IHZpZGVvIG9ubHlcblx0XHR2aWRlbzoge1xuXHRcdFx0dHBsOlxuXHRcdFx0XHQnPHZpZGVvIGNsYXNzPVwiZmFuY3lib3gtdmlkZW9cIiBjb250cm9scyBjb250cm9sc0xpc3Q9XCJub2Rvd25sb2FkXCIgcG9zdGVyPVwie3twb3N0ZXJ9fVwiPicgK1xuXHRcdFx0XHQnPHNvdXJjZSBzcmM9XCJ7e3NyY319XCIgdHlwZT1cInt7Zm9ybWF0fX1cIiAvPicgK1xuXHRcdFx0XHQnU29ycnksIHlvdXIgYnJvd3NlciBkb2VzblxcJ3Qgc3VwcG9ydCBlbWJlZGRlZCB2aWRlb3MsIDxhIGhyZWY9XCJ7e3NyY319XCI+ZG93bmxvYWQ8L2E+IGFuZCB3YXRjaCB3aXRoIHlvdXIgZmF2b3JpdGUgdmlkZW8gcGxheWVyIScgK1xuXHRcdFx0XHRcIjwvdmlkZW8+XCIsXG5cdFx0XHRmb3JtYXQ6IFwiXCIsIC8vIGN1c3RvbSB2aWRlbyBmb3JtYXRcblx0XHRcdGF1dG9TdGFydDogdHJ1ZVxuXHRcdH0sXG5cblx0XHQvLyBEZWZhdWx0IGNvbnRlbnQgdHlwZSBpZiBjYW5ub3QgYmUgZGV0ZWN0ZWQgYXV0b21hdGljYWxseVxuXHRcdGRlZmF1bHRUeXBlOiBcImltYWdlXCIsXG5cblx0XHQvLyBPcGVuL2Nsb3NlIGFuaW1hdGlvbiB0eXBlXG5cdFx0Ly8gUG9zc2libGUgdmFsdWVzOlxuXHRcdC8vICAgZmFsc2UgICAgICAgICAgICAtIGRpc2FibGVcblx0XHQvLyAgIFwiem9vbVwiICAgICAgICAgICAtIHpvb20gaW1hZ2VzIGZyb20vdG8gdGh1bWJuYWlsXG5cdFx0Ly8gICBcImZhZGVcIlxuXHRcdC8vICAgXCJ6b29tLWluLW91dFwiXG5cdFx0Ly9cblx0XHRhbmltYXRpb25FZmZlY3Q6IFwiem9vbVwiLFxuXG5cdFx0Ly8gRHVyYXRpb24gaW4gbXMgZm9yIG9wZW4vY2xvc2UgYW5pbWF0aW9uXG5cdFx0YW5pbWF0aW9uRHVyYXRpb246IDM2NixcblxuXHRcdC8vIFNob3VsZCBpbWFnZSBjaGFuZ2Ugb3BhY2l0eSB3aGlsZSB6b29taW5nXG5cdFx0Ly8gSWYgb3BhY2l0eSBpcyBcImF1dG9cIiwgdGhlbiBvcGFjaXR5IHdpbGwgYmUgY2hhbmdlZCBpZiBpbWFnZSBhbmQgdGh1bWJuYWlsIGhhdmUgZGlmZmVyZW50IGFzcGVjdCByYXRpb3Ncblx0XHR6b29tT3BhY2l0eTogXCJhdXRvXCIsXG5cblx0XHQvLyBUcmFuc2l0aW9uIGVmZmVjdCBiZXR3ZWVuIHNsaWRlc1xuXHRcdC8vXG5cdFx0Ly8gUG9zc2libGUgdmFsdWVzOlxuXHRcdC8vICAgZmFsc2UgICAgICAgICAgICAtIGRpc2FibGVcblx0XHQvLyAgIFwiZmFkZSdcblx0XHQvLyAgIFwic2xpZGUnXG5cdFx0Ly8gICBcImNpcmN1bGFyJ1xuXHRcdC8vICAgXCJ0dWJlJ1xuXHRcdC8vICAgXCJ6b29tLWluLW91dCdcblx0XHQvLyAgIFwicm90YXRlJ1xuXHRcdC8vXG5cdFx0dHJhbnNpdGlvbkVmZmVjdDogXCJmYWRlXCIsXG5cblx0XHQvLyBEdXJhdGlvbiBpbiBtcyBmb3IgdHJhbnNpdGlvbiBhbmltYXRpb25cblx0XHR0cmFuc2l0aW9uRHVyYXRpb246IDM2NixcblxuXHRcdC8vIEN1c3RvbSBDU1MgY2xhc3MgZm9yIHNsaWRlIGVsZW1lbnRcblx0XHRzbGlkZUNsYXNzOiBcIlwiLFxuXG5cdFx0Ly8gQ3VzdG9tIENTUyBjbGFzcyBmb3IgbGF5b3V0XG5cdFx0YmFzZUNsYXNzOiBcIlwiLFxuXG5cdFx0Ly8gQmFzZSB0ZW1wbGF0ZSBmb3IgbGF5b3V0XG5cdFx0YmFzZVRwbDpcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtY29udGFpbmVyXCIgcm9sZT1cImRpYWxvZ1wiIHRhYmluZGV4PVwiLTFcIj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtYmdcIj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtaW5uZXJcIj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtaW5mb2JhclwiPjxzcGFuIGRhdGEtZmFuY3lib3gtaW5kZXg+PC9zcGFuPiZuYnNwOy8mbmJzcDs8c3BhbiBkYXRhLWZhbmN5Ym94LWNvdW50Pjwvc3Bhbj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtdG9vbGJhclwiPnt7YnV0dG9uc319PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LW5hdmlnYXRpb25cIj57e2Fycm93c319PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LXN0YWdlXCI+PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LWNhcHRpb25cIj48L2Rpdj4nICtcblx0XHRcdFwiPC9kaXY+XCIgK1xuXHRcdFx0XCI8L2Rpdj5cIixcblxuXHRcdC8vIExvYWRpbmcgaW5kaWNhdG9yIHRlbXBsYXRlXG5cdFx0c3Bpbm5lclRwbDogJzxkaXYgY2xhc3M9XCJmYW5jeWJveC1sb2FkaW5nXCI+PC9kaXY+JyxcblxuXHRcdC8vIEVycm9yIG1lc3NhZ2UgdGVtcGxhdGVcblx0XHRlcnJvclRwbDogJzxkaXYgY2xhc3M9XCJmYW5jeWJveC1lcnJvclwiPjxwPnt7RVJST1J9fTwvcD48L2Rpdj4nLFxuXG5cdFx0YnRuVHBsOiB7XG5cdFx0XHRkb3dubG9hZDpcblx0XHRcdFx0JzxhIGRvd25sb2FkIGRhdGEtZmFuY3lib3gtZG93bmxvYWQgY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS1kb3dubG9hZFwiIHRpdGxlPVwie3tET1dOTE9BRH19XCIgaHJlZj1cImphdmFzY3JpcHQ6O1wiPicgK1xuXHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMTguNjIgMTcuMDlWMTlINS4zOHYtMS45MXptLTIuOTctNi45NkwxNyAxMS40NWwtNSA0Ljg3LTUtNC44NyAxLjM2LTEuMzIgMi42OCAyLjY0VjVoMS45MnY3Ljc3elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8L2E+XCIsXG5cblx0XHRcdHpvb206XG5cdFx0XHRcdCc8YnV0dG9uIGRhdGEtZmFuY3lib3gtem9vbSBjbGFzcz1cImZhbmN5Ym94LWJ1dHRvbiBmYW5jeWJveC1idXR0b24tLXpvb21cIiB0aXRsZT1cInt7Wk9PTX19XCI+JyArXG5cdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk0xOC43IDE3LjNsLTMtM2E1LjkgNS45IDAgMCAwLS42LTcuNiA1LjkgNS45IDAgMCAwLTguNCAwIDUuOSA1LjkgMCAwIDAgMCA4LjQgNS45IDUuOSAwIDAgMCA3LjcuN2wzIDNhMSAxIDAgMCAwIDEuMyAwYy40LS41LjQtMSAwLTEuNXpNOC4xIDEzLjhhNCA0IDAgMCAxIDAtNS43IDQgNCAwIDAgMSA1LjcgMCA0IDQgMCAwIDEgMCA1LjcgNCA0IDAgMCAxLTUuNyAwelwiLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8L2J1dHRvbj5cIixcblxuXHRcdFx0Y2xvc2U6XG5cdFx0XHRcdCc8YnV0dG9uIGRhdGEtZmFuY3lib3gtY2xvc2UgY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS1jbG9zZVwiIHRpdGxlPVwie3tDTE9TRX19XCI+JyArXG5cdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk0xMiAxMC42TDYuNiA1LjIgNS4yIDYuNmw1LjQgNS40LTUuNCA1LjQgMS40IDEuNCA1LjQtNS40IDUuNCA1LjQgMS40LTEuNC01LjQtNS40IDUuNC01LjQtMS40LTEuNC01LjQgNS40elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8L2J1dHRvbj5cIixcblxuXHRcdFx0Ly8gQXJyb3dzXG5cdFx0XHRhcnJvd0xlZnQ6XG5cdFx0XHRcdCc8YnV0dG9uIGRhdGEtZmFuY3lib3gtcHJldiBjbGFzcz1cImZhbmN5Ym94LWJ1dHRvbiBmYW5jeWJveC1idXR0b24tLWFycm93X2xlZnRcIiB0aXRsZT1cInt7UFJFVn19XCI+JyArXG5cdFx0XHRcdCc8ZGl2PjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTExLjI4IDE1LjdsLTEuMzQgMS4zN0w1IDEybDQuOTQtNS4wNyAxLjM0IDEuMzgtMi42OCAyLjcySDE5djEuOTRIOC42elwiLz48L3N2Zz48L2Rpdj4nICtcblx0XHRcdFx0XCI8L2J1dHRvbj5cIixcblxuXHRcdFx0YXJyb3dSaWdodDpcblx0XHRcdFx0JzxidXR0b24gZGF0YS1mYW5jeWJveC1uZXh0IGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tYXJyb3dfcmlnaHRcIiB0aXRsZT1cInt7TkVYVH19XCI+JyArXG5cdFx0XHRcdCc8ZGl2PjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTE1LjQgMTIuOTdsLTIuNjggMi43MiAxLjM0IDEuMzhMMTkgMTJsLTQuOTQtNS4wNy0xLjM0IDEuMzggMi42OCAyLjcySDV2MS45NHpcIi8+PC9zdmc+PC9kaXY+JyArXG5cdFx0XHRcdFwiPC9idXR0b24+XCIsXG5cblx0XHRcdC8vIFRoaXMgc21hbGwgY2xvc2UgYnV0dG9uIHdpbGwgYmUgYXBwZW5kZWQgdG8geW91ciBodG1sL2lubGluZS9hamF4IGNvbnRlbnQgYnkgZGVmYXVsdCxcblx0XHRcdC8vIGlmIFwic21hbGxCdG5cIiBvcHRpb24gaXMgbm90IHNldCB0byBmYWxzZVxuXHRcdFx0c21hbGxCdG46XG5cdFx0XHRcdCc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWZhbmN5Ym94LWNsb3NlIGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWNsb3NlLXNtYWxsXCIgdGl0bGU9XCJ7e0NMT1NFfX1cIj4nICtcblx0XHRcdFx0JzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZlcnNpb249XCIxXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMTMgMTJsNS01LTEtMS01IDUtNS01LTEgMSA1IDUtNSA1IDEgMSA1LTUgNSA1IDEtMXpcIi8+PC9zdmc+JyArXG5cdFx0XHRcdFwiPC9idXR0b24+XCJcblx0XHR9LFxuXG5cdFx0Ly8gQ29udGFpbmVyIGlzIGluamVjdGVkIGludG8gdGhpcyBlbGVtZW50XG5cdFx0cGFyZW50RWw6IFwiYm9keVwiLFxuXG5cdFx0Ly8gSGlkZSBicm93c2VyIHZlcnRpY2FsIHNjcm9sbGJhcnM7IHVzZSBhdCB5b3VyIG93biByaXNrXG5cdFx0aGlkZVNjcm9sbGJhcjogdHJ1ZSxcblxuXHRcdC8vIEZvY3VzIGhhbmRsaW5nXG5cdFx0Ly8gPT09PT09PT09PT09PT1cblxuXHRcdC8vIFRyeSB0byBmb2N1cyBvbiB0aGUgZmlyc3QgZm9jdXNhYmxlIGVsZW1lbnQgYWZ0ZXIgb3BlbmluZ1xuXHRcdGF1dG9Gb2N1czogdHJ1ZSxcblxuXHRcdC8vIFB1dCBmb2N1cyBiYWNrIHRvIGFjdGl2ZSBlbGVtZW50IGFmdGVyIGNsb3Npbmdcblx0XHRiYWNrRm9jdXM6IHRydWUsXG5cblx0XHQvLyBEbyBub3QgbGV0IHVzZXIgdG8gZm9jdXMgb24gZWxlbWVudCBvdXRzaWRlIG1vZGFsIGNvbnRlbnRcblx0XHR0cmFwRm9jdXM6IHRydWUsXG5cblx0XHQvLyBNb2R1bGUgc3BlY2lmaWMgb3B0aW9uc1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRmdWxsU2NyZWVuOiB7XG5cdFx0XHRhdXRvU3RhcnQ6IGZhbHNlXG5cdFx0fSxcblxuXHRcdC8vIFNldCBgdG91Y2g6IGZhbHNlYCB0byBkaXNhYmxlIHBhbm5pbmcvc3dpcGluZ1xuXHRcdHRvdWNoOiB7XG5cdFx0XHR2ZXJ0aWNhbDogdHJ1ZSwgLy8gQWxsb3cgdG8gZHJhZyBjb250ZW50IHZlcnRpY2FsbHlcblx0XHRcdG1vbWVudHVtOiB0cnVlIC8vIENvbnRpbnVlIG1vdmVtZW50IGFmdGVyIHJlbGVhc2luZyBtb3VzZS90b3VjaCB3aGVuIHBhbm5pbmdcblx0XHR9LFxuXG5cdFx0Ly8gSGFzaCB2YWx1ZSB3aGVuIGluaXRpYWxpemluZyBtYW51YWxseSxcblx0XHQvLyBzZXQgYGZhbHNlYCB0byBkaXNhYmxlIGhhc2ggY2hhbmdlXG5cdFx0aGFzaDogbnVsbCxcblxuXHRcdC8vIEN1c3RvbWl6ZSBvciBhZGQgbmV3IG1lZGlhIHR5cGVzXG5cdFx0Ly8gRXhhbXBsZTpcblx0XHQvKlxuICAgICAgbWVkaWEgOiB7XG4gICAgICAgIHlvdXR1YmUgOiB7XG4gICAgICAgICAgcGFyYW1zIDoge1xuICAgICAgICAgICAgYXV0b3BsYXkgOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgKi9cblx0XHRtZWRpYToge30sXG5cblx0XHRzbGlkZVNob3c6IHtcblx0XHRcdGF1dG9TdGFydDogZmFsc2UsXG5cdFx0XHRzcGVlZDogMzAwMFxuXHRcdH0sXG5cblx0XHR0aHVtYnM6IHtcblx0XHRcdGF1dG9TdGFydDogZmFsc2UsIC8vIERpc3BsYXkgdGh1bWJuYWlscyBvbiBvcGVuaW5nXG5cdFx0XHRoaWRlT25DbG9zZTogdHJ1ZSwgLy8gSGlkZSB0aHVtYm5haWwgZ3JpZCB3aGVuIGNsb3NpbmcgYW5pbWF0aW9uIHN0YXJ0c1xuXHRcdFx0cGFyZW50RWw6IFwiLmZhbmN5Ym94LWNvbnRhaW5lclwiLCAvLyBDb250YWluZXIgaXMgaW5qZWN0ZWQgaW50byB0aGlzIGVsZW1lbnRcblx0XHRcdGF4aXM6IFwieVwiIC8vIFZlcnRpY2FsICh5KSBvciBob3Jpem9udGFsICh4KSBzY3JvbGxpbmdcblx0XHR9LFxuXG5cdFx0Ly8gVXNlIG1vdXNld2hlZWwgdG8gbmF2aWdhdGUgZ2FsbGVyeVxuXHRcdC8vIElmICdhdXRvJyAtIGVuYWJsZWQgZm9yIGltYWdlcyBvbmx5XG5cdFx0d2hlZWw6IFwiYXV0b1wiLFxuXG5cdFx0Ly8gQ2FsbGJhY2tzXG5cdFx0Ly89PT09PT09PT09XG5cblx0XHQvLyBTZWUgRG9jdW1lbnRhdGlvbi9BUEkvRXZlbnRzIGZvciBtb3JlIGluZm9ybWF0aW9uXG5cdFx0Ly8gRXhhbXBsZTpcblx0XHQvKlxuICAgICAgYWZ0ZXJTaG93OiBmdW5jdGlvbiggaW5zdGFuY2UsIGN1cnJlbnQgKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyggJ0NsaWNrZWQgZWxlbWVudDonICk7XG4gICAgICAgIGNvbnNvbGUuaW5mbyggY3VycmVudC5vcHRzLiRvcmlnICk7XG4gICAgICB9XG4gICAgKi9cblxuXHRcdG9uSW5pdDogJC5ub29wLCAvLyBXaGVuIGluc3RhbmNlIGhhcyBiZWVuIGluaXRpYWxpemVkXG5cblx0XHRiZWZvcmVMb2FkOiAkLm5vb3AsIC8vIEJlZm9yZSB0aGUgY29udGVudCBvZiBhIHNsaWRlIGlzIGJlaW5nIGxvYWRlZFxuXHRcdGFmdGVyTG9hZDogJC5ub29wLCAvLyBXaGVuIHRoZSBjb250ZW50IG9mIGEgc2xpZGUgaXMgZG9uZSBsb2FkaW5nXG5cblx0XHRiZWZvcmVTaG93OiAkLm5vb3AsIC8vIEJlZm9yZSBvcGVuIGFuaW1hdGlvbiBzdGFydHNcblx0XHRhZnRlclNob3c6ICQubm9vcCwgLy8gV2hlbiBjb250ZW50IGlzIGRvbmUgbG9hZGluZyBhbmQgYW5pbWF0aW5nXG5cblx0XHRiZWZvcmVDbG9zZTogJC5ub29wLCAvLyBCZWZvcmUgdGhlIGluc3RhbmNlIGF0dGVtcHRzIHRvIGNsb3NlLiBSZXR1cm4gZmFsc2UgdG8gY2FuY2VsIHRoZSBjbG9zZS5cblx0XHRhZnRlckNsb3NlOiAkLm5vb3AsIC8vIEFmdGVyIGluc3RhbmNlIGhhcyBiZWVuIGNsb3NlZFxuXG5cdFx0b25BY3RpdmF0ZTogJC5ub29wLCAvLyBXaGVuIGluc3RhbmNlIGlzIGJyb3VnaHQgdG8gZnJvbnRcblx0XHRvbkRlYWN0aXZhdGU6ICQubm9vcCwgLy8gV2hlbiBvdGhlciBpbnN0YW5jZSBoYXMgYmVlbiBhY3RpdmF0ZWRcblxuXHRcdC8vIEludGVyYWN0aW9uXG5cdFx0Ly8gPT09PT09PT09PT1cblxuXHRcdC8vIFVzZSBvcHRpb25zIGJlbG93IHRvIGN1c3RvbWl6ZSB0YWtlbiBhY3Rpb24gd2hlbiB1c2VyIGNsaWNrcyBvciBkb3VibGUgY2xpY2tzIG9uIHRoZSBmYW5jeUJveCBhcmVhLFxuXHRcdC8vIGVhY2ggb3B0aW9uIGNhbiBiZSBzdHJpbmcgb3IgbWV0aG9kIHRoYXQgcmV0dXJucyB2YWx1ZS5cblx0XHQvL1xuXHRcdC8vIFBvc3NpYmxlIHZhbHVlczpcblx0XHQvLyAgIFwiY2xvc2VcIiAgICAgICAgICAgLSBjbG9zZSBpbnN0YW5jZVxuXHRcdC8vICAgXCJuZXh0XCIgICAgICAgICAgICAtIG1vdmUgdG8gbmV4dCBnYWxsZXJ5IGl0ZW1cblx0XHQvLyAgIFwibmV4dE9yQ2xvc2VcIiAgICAgLSBtb3ZlIHRvIG5leHQgZ2FsbGVyeSBpdGVtIG9yIGNsb3NlIGlmIGdhbGxlcnkgaGFzIG9ubHkgb25lIGl0ZW1cblx0XHQvLyAgIFwidG9nZ2xlQ29udHJvbHNcIiAgLSBzaG93L2hpZGUgY29udHJvbHNcblx0XHQvLyAgIFwiem9vbVwiICAgICAgICAgICAgLSB6b29tIGltYWdlIChpZiBsb2FkZWQpXG5cdFx0Ly8gICBmYWxzZSAgICAgICAgICAgICAtIGRvIG5vdGhpbmdcblxuXHRcdC8vIENsaWNrZWQgb24gdGhlIGNvbnRlbnRcblx0XHRjbGlja0NvbnRlbnQ6IGZ1bmN0aW9uKGN1cnJlbnQsIGV2ZW50KSB7XG5cdFx0XHRyZXR1cm4gY3VycmVudC50eXBlID09PSBcImltYWdlXCIgPyBcInpvb21cIiA6IGZhbHNlO1xuXHRcdH0sXG5cblx0XHQvLyBDbGlja2VkIG9uIHRoZSBzbGlkZVxuXHRcdGNsaWNrU2xpZGU6IFwiY2xvc2VcIixcblxuXHRcdC8vIENsaWNrZWQgb24gdGhlIGJhY2tncm91bmQgKGJhY2tkcm9wKSBlbGVtZW50O1xuXHRcdC8vIGlmIHlvdSBoYXZlIG5vdCBjaGFuZ2VkIHRoZSBsYXlvdXQsIHRoZW4gbW9zdCBsaWtlbHkgeW91IG5lZWQgdG8gdXNlIGBjbGlja1NsaWRlYCBvcHRpb25cblx0XHRjbGlja091dHNpZGU6IFwiY2xvc2VcIixcblxuXHRcdC8vIFNhbWUgYXMgcHJldmlvdXMgdHdvLCBidXQgZm9yIGRvdWJsZSBjbGlja1xuXHRcdGRibGNsaWNrQ29udGVudDogZmFsc2UsXG5cdFx0ZGJsY2xpY2tTbGlkZTogZmFsc2UsXG5cdFx0ZGJsY2xpY2tPdXRzaWRlOiBmYWxzZSxcblxuXHRcdC8vIEN1c3RvbSBvcHRpb25zIHdoZW4gbW9iaWxlIGRldmljZSBpcyBkZXRlY3RlZFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0bW9iaWxlOiB7XG5cdFx0XHRwcmV2ZW50Q2FwdGlvbk92ZXJsYXA6IGZhbHNlLFxuXHRcdFx0aWRsZVRpbWU6IGZhbHNlLFxuXHRcdFx0Y2xpY2tDb250ZW50OiBmdW5jdGlvbihjdXJyZW50LCBldmVudCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudC50eXBlID09PSBcImltYWdlXCIgPyBcInRvZ2dsZUNvbnRyb2xzXCIgOiBmYWxzZTtcblx0XHRcdH0sXG5cdFx0XHRjbGlja1NsaWRlOiBmdW5jdGlvbihjdXJyZW50LCBldmVudCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudC50eXBlID09PSBcImltYWdlXCIgPyBcInRvZ2dsZUNvbnRyb2xzXCIgOiBcImNsb3NlXCI7XG5cdFx0XHR9LFxuXHRcdFx0ZGJsY2xpY2tDb250ZW50OiBmdW5jdGlvbihjdXJyZW50LCBldmVudCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudC50eXBlID09PSBcImltYWdlXCIgPyBcInpvb21cIiA6IGZhbHNlO1xuXHRcdFx0fSxcblx0XHRcdGRibGNsaWNrU2xpZGU6IGZ1bmN0aW9uKGN1cnJlbnQsIGV2ZW50KSB7XG5cdFx0XHRcdHJldHVybiBjdXJyZW50LnR5cGUgPT09IFwiaW1hZ2VcIiA/IFwiem9vbVwiIDogZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIEludGVybmF0aW9uYWxpemF0aW9uXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGxhbmc6IFwiZW5cIixcblx0XHRpMThuOiB7XG5cdFx0XHRlbjoge1xuXHRcdFx0XHRDTE9TRTogXCJDbG9zZVwiLFxuXHRcdFx0XHRORVhUOiBcIk5leHRcIixcblx0XHRcdFx0UFJFVjogXCJQcmV2aW91c1wiLFxuXHRcdFx0XHRFUlJPUjogXCJUaGUgcmVxdWVzdGVkIGNvbnRlbnQgY2Fubm90IGJlIGxvYWRlZC4gPGJyLz4gUGxlYXNlIHRyeSBhZ2FpbiBsYXRlci5cIixcblx0XHRcdFx0UExBWV9TVEFSVDogXCJTdGFydCBzbGlkZXNob3dcIixcblx0XHRcdFx0UExBWV9TVE9QOiBcIlBhdXNlIHNsaWRlc2hvd1wiLFxuXHRcdFx0XHRGVUxMX1NDUkVFTjogXCJGdWxsIHNjcmVlblwiLFxuXHRcdFx0XHRUSFVNQlM6IFwiVGh1bWJuYWlsc1wiLFxuXHRcdFx0XHRET1dOTE9BRDogXCJEb3dubG9hZFwiLFxuXHRcdFx0XHRTSEFSRTogXCJTaGFyZVwiLFxuXHRcdFx0XHRaT09NOiBcIlpvb21cIlxuXHRcdFx0fSxcblx0XHRcdGRlOiB7XG5cdFx0XHRcdENMT1NFOiBcIlNjaGxpZXNzZW5cIixcblx0XHRcdFx0TkVYVDogXCJXZWl0ZXJcIixcblx0XHRcdFx0UFJFVjogXCJadXLDvGNrXCIsXG5cdFx0XHRcdEVSUk9SOiBcIkRpZSBhbmdlZm9yZGVydGVuIERhdGVuIGtvbm50ZW4gbmljaHQgZ2VsYWRlbiB3ZXJkZW4uIDxici8+IEJpdHRlIHZlcnN1Y2hlbiBTaWUgZXMgc3DDpHRlciBub2NobWFsLlwiLFxuXHRcdFx0XHRQTEFZX1NUQVJUOiBcIkRpYXNjaGF1IHN0YXJ0ZW5cIixcblx0XHRcdFx0UExBWV9TVE9QOiBcIkRpYXNjaGF1IGJlZW5kZW5cIixcblx0XHRcdFx0RlVMTF9TQ1JFRU46IFwiVm9sbGJpbGRcIixcblx0XHRcdFx0VEhVTUJTOiBcIlZvcnNjaGF1YmlsZGVyXCIsXG5cdFx0XHRcdERPV05MT0FEOiBcIkhlcnVudGVybGFkZW5cIixcblx0XHRcdFx0U0hBUkU6IFwiVGVpbGVuXCIsXG5cdFx0XHRcdFpPT006IFwiTWHDn3N0YWJcIlxuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvLyBGZXcgdXNlZnVsIHZhcmlhYmxlcyBhbmQgbWV0aG9kc1xuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdHZhciAkVyA9ICQod2luZG93KTtcblx0dmFyICREID0gJChkb2N1bWVudCk7XG5cblx0dmFyIGNhbGxlZCA9IDA7XG5cblx0Ly8gQ2hlY2sgaWYgYW4gb2JqZWN0IGlzIGEgalF1ZXJ5IG9iamVjdCBhbmQgbm90IGEgbmF0aXZlIEphdmFTY3JpcHQgb2JqZWN0XG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHR2YXIgaXNRdWVyeSA9IGZ1bmN0aW9uKG9iaikge1xuXHRcdHJldHVybiBvYmogJiYgb2JqLmhhc093blByb3BlcnR5ICYmIG9iaiBpbnN0YW5jZW9mICQ7XG5cdH07XG5cblx0Ly8gSGFuZGxlIG11bHRpcGxlIGJyb3dzZXJzIGZvciBcInJlcXVlc3RBbmltYXRpb25GcmFtZVwiIGFuZCBcImNhbmNlbEFuaW1hdGlvbkZyYW1lXCJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHR2YXIgcmVxdWVzdEFGcmFtZSA9IChmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdC8vIGlmIGFsbCBlbHNlIGZhaWxzLCB1c2Ugc2V0VGltZW91dFxuXHRcdFx0ZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRcdFx0cmV0dXJuIHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH0pKCk7XG5cblx0dmFyIGNhbmNlbEFGcmFtZSA9IChmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHR3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93Lm9DYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0ZnVuY3Rpb24oaWQpIHtcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChpZCk7XG5cdFx0XHR9XG5cdFx0KTtcblx0fSkoKTtcblxuXHQvLyBEZXRlY3QgdGhlIHN1cHBvcnRlZCB0cmFuc2l0aW9uLWVuZCBldmVudCBwcm9wZXJ0eSBuYW1lXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0dmFyIHRyYW5zaXRpb25FbmQgPSAoZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImZha2VlbGVtZW50XCIpLFxuXHRcdFx0dDtcblxuXHRcdHZhciB0cmFuc2l0aW9ucyA9IHtcblx0XHRcdHRyYW5zaXRpb246IFwidHJhbnNpdGlvbmVuZFwiLFxuXHRcdFx0T1RyYW5zaXRpb246IFwib1RyYW5zaXRpb25FbmRcIixcblx0XHRcdE1velRyYW5zaXRpb246IFwidHJhbnNpdGlvbmVuZFwiLFxuXHRcdFx0V2Via2l0VHJhbnNpdGlvbjogXCJ3ZWJraXRUcmFuc2l0aW9uRW5kXCJcblx0XHR9O1xuXG5cdFx0Zm9yICh0IGluIHRyYW5zaXRpb25zKSB7XG5cdFx0XHRpZiAoZWwuc3R5bGVbdF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRyZXR1cm4gdHJhbnNpdGlvbnNbdF07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFwidHJhbnNpdGlvbmVuZFwiO1xuXHR9KSgpO1xuXG5cdC8vIEZvcmNlIHJlZHJhdyBvbiBhbiBlbGVtZW50LlxuXHQvLyBUaGlzIGhlbHBzIGluIGNhc2VzIHdoZXJlIHRoZSBicm93c2VyIGRvZXNuJ3QgcmVkcmF3IGFuIHVwZGF0ZWQgZWxlbWVudCBwcm9wZXJseVxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHR2YXIgZm9yY2VSZWRyYXcgPSBmdW5jdGlvbigkZWwpIHtcblx0XHRyZXR1cm4gJGVsICYmICRlbC5sZW5ndGggJiYgJGVsWzBdLm9mZnNldEhlaWdodDtcblx0fTtcblxuXHQvLyBFeGNsdWRlIGFycmF5IChgYnV0dG9uc2ApIG9wdGlvbnMgZnJvbSBkZWVwIG1lcmdpbmdcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdHZhciBtZXJnZU9wdHMgPSBmdW5jdGlvbihvcHRzMSwgb3B0czIpIHtcblx0XHR2YXIgcmV6ID0gJC5leHRlbmQodHJ1ZSwge30sIG9wdHMxLCBvcHRzMik7XG5cblx0XHQkLmVhY2gob3B0czIsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0XHRcdGlmICgkLmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0XHRcdHJleltrZXldID0gdmFsdWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gcmV6O1xuXHR9O1xuXG5cdC8vIEhvdyBtdWNoIG9mIGFuIGVsZW1lbnQgaXMgdmlzaWJsZSBpbiB2aWV3cG9ydFxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHR2YXIgaW5WaWV3cG9ydCA9IGZ1bmN0aW9uKGVsZW0pIHtcblx0XHR2YXIgZWxlbUNlbnRlciwgcmV6O1xuXG5cdFx0aWYgKCFlbGVtIHx8IGVsZW0ub3duZXJEb2N1bWVudCAhPT0gZG9jdW1lbnQpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQkKFwiLmZhbmN5Ym94LWNvbnRhaW5lclwiKS5jc3MoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cblx0XHRlbGVtQ2VudGVyID0ge1xuXHRcdFx0eDogZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0ICsgZWxlbS5vZmZzZXRXaWR0aCAvIDIsXG5cdFx0XHR5OiBlbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCArIGVsZW0ub2Zmc2V0SGVpZ2h0IC8gMlxuXHRcdH07XG5cblx0XHRyZXogPSBkb2N1bWVudC5lbGVtZW50RnJvbVBvaW50KGVsZW1DZW50ZXIueCwgZWxlbUNlbnRlci55KSA9PT0gZWxlbTtcblxuXHRcdCQoXCIuZmFuY3lib3gtY29udGFpbmVyXCIpLmNzcyhcInBvaW50ZXItZXZlbnRzXCIsIFwiXCIpO1xuXG5cdFx0cmV0dXJuIHJlejtcblx0fTtcblxuXHQvLyBDbGFzcyBkZWZpbml0aW9uXG5cdC8vID09PT09PT09PT09PT09PT1cblxuXHR2YXIgRmFuY3lCb3ggPSBmdW5jdGlvbihjb250ZW50LCBvcHRzLCBpbmRleCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYub3B0cyA9IG1lcmdlT3B0cyh7aW5kZXg6IGluZGV4fSwgJC5mYW5jeWJveC5kZWZhdWx0cyk7XG5cblx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KG9wdHMpKSB7XG5cdFx0XHRzZWxmLm9wdHMgPSBtZXJnZU9wdHMoc2VsZi5vcHRzLCBvcHRzKTtcblx0XHR9XG5cblx0XHRpZiAoJC5mYW5jeWJveC5pc01vYmlsZSkge1xuXHRcdFx0c2VsZi5vcHRzID0gbWVyZ2VPcHRzKHNlbGYub3B0cywgc2VsZi5vcHRzLm1vYmlsZSk7XG5cdFx0fVxuXG5cdFx0c2VsZi5pZCA9IHNlbGYub3B0cy5pZCB8fCArK2NhbGxlZDtcblxuXHRcdHNlbGYuY3VyckluZGV4ID0gcGFyc2VJbnQoc2VsZi5vcHRzLmluZGV4LCAxMCkgfHwgMDtcblx0XHRzZWxmLnByZXZJbmRleCA9IG51bGw7XG5cblx0XHRzZWxmLnByZXZQb3MgPSBudWxsO1xuXHRcdHNlbGYuY3VyclBvcyA9IDA7XG5cblx0XHRzZWxmLmZpcnN0UnVuID0gdHJ1ZTtcblxuXHRcdC8vIEFsbCBncm91cCBpdGVtc1xuXHRcdHNlbGYuZ3JvdXAgPSBbXTtcblxuXHRcdC8vIEV4aXN0aW5nIHNsaWRlcyAoZm9yIGN1cnJlbnQsIG5leHQgYW5kIHByZXZpb3VzIGdhbGxlcnkgaXRlbXMpXG5cdFx0c2VsZi5zbGlkZXMgPSB7fTtcblxuXHRcdC8vIENyZWF0ZSBncm91cCBlbGVtZW50c1xuXHRcdHNlbGYuYWRkQ29udGVudChjb250ZW50KTtcblxuXHRcdGlmICghc2VsZi5ncm91cC5sZW5ndGgpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzZWxmLmluaXQoKTtcblx0fTtcblxuXHQkLmV4dGVuZChGYW5jeUJveC5wcm90b3R5cGUsIHtcblx0XHQvLyBDcmVhdGUgRE9NIHN0cnVjdHVyZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09XG5cblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Zmlyc3RJdGVtID0gc2VsZi5ncm91cFtzZWxmLmN1cnJJbmRleF0sXG5cdFx0XHRcdGZpcnN0SXRlbU9wdHMgPSBmaXJzdEl0ZW0ub3B0cyxcblx0XHRcdFx0JGNvbnRhaW5lcixcblx0XHRcdFx0YnV0dG9uU3RyO1xuXG5cdFx0XHRpZiAoZmlyc3RJdGVtT3B0cy5jbG9zZUV4aXN0aW5nKSB7XG5cdFx0XHRcdCQuZmFuY3lib3guY2xvc2UodHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEhpZGUgc2Nyb2xsYmFyc1xuXHRcdFx0Ly8gPT09PT09PT09PT09PT09XG5cblx0XHRcdCQoXCJib2R5XCIpLmFkZENsYXNzKFwiZmFuY3lib3gtYWN0aXZlXCIpO1xuXG5cdFx0XHRpZiAoXG5cdFx0XHRcdCEkLmZhbmN5Ym94LmdldEluc3RhbmNlKCkgJiZcblx0XHRcdFx0Zmlyc3RJdGVtT3B0cy5oaWRlU2Nyb2xsYmFyICE9PSBmYWxzZSAmJlxuXHRcdFx0XHQhJC5mYW5jeWJveC5pc01vYmlsZSAmJlxuXHRcdFx0XHRkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodCA+IHdpbmRvdy5pbm5lckhlaWdodFxuXHRcdFx0KSB7XG5cdFx0XHRcdCQoXCJoZWFkXCIpLmFwcGVuZChcblx0XHRcdFx0XHQnPHN0eWxlIGlkPVwiZmFuY3lib3gtc3R5bGUtbm9zY3JvbGxcIiB0eXBlPVwidGV4dC9jc3NcIj4uY29tcGVuc2F0ZS1mb3Itc2Nyb2xsYmFye21hcmdpbi1yaWdodDonICtcblx0XHRcdFx0XHQod2luZG93LmlubmVyV2lkdGggLSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgpICtcblx0XHRcdFx0XHRcInB4O308L3N0eWxlPlwiXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0JChcImJvZHlcIikuYWRkQ2xhc3MoXCJjb21wZW5zYXRlLWZvci1zY3JvbGxiYXJcIik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEJ1aWxkIGh0bWwgbWFya3VwIGFuZCBzZXQgcmVmZXJlbmNlc1xuXHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdC8vIEJ1aWxkIGh0bWwgY29kZSBmb3IgYnV0dG9ucyBhbmQgaW5zZXJ0IGludG8gbWFpbiB0ZW1wbGF0ZVxuXHRcdFx0YnV0dG9uU3RyID0gXCJcIjtcblxuXHRcdFx0JC5lYWNoKGZpcnN0SXRlbU9wdHMuYnV0dG9ucywgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cdFx0XHRcdGJ1dHRvblN0ciArPSBmaXJzdEl0ZW1PcHRzLmJ0blRwbFt2YWx1ZV0gfHwgXCJcIjtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBDcmVhdGUgbWFya3VwIGZyb20gYmFzZSB0ZW1wbGF0ZSwgaXQgd2lsbCBiZSBpbml0aWFsbHkgaGlkZGVuIHRvXG5cdFx0XHQvLyBhdm9pZCB1bm5lY2Vzc2FyeSB3b3JrIGxpa2UgcGFpbnRpbmcgd2hpbGUgaW5pdGlhbGl6aW5nIGlzIG5vdCBjb21wbGV0ZVxuXHRcdFx0JGNvbnRhaW5lciA9ICQoXG5cdFx0XHRcdHNlbGYudHJhbnNsYXRlKFxuXHRcdFx0XHRcdHNlbGYsXG5cdFx0XHRcdFx0Zmlyc3RJdGVtT3B0cy5iYXNlVHBsXG5cdFx0XHRcdFx0XHQucmVwbGFjZShcInt7YnV0dG9uc319XCIsIGJ1dHRvblN0cilcblx0XHRcdFx0XHRcdC5yZXBsYWNlKFwie3thcnJvd3N9fVwiLCBmaXJzdEl0ZW1PcHRzLmJ0blRwbC5hcnJvd0xlZnQgKyBmaXJzdEl0ZW1PcHRzLmJ0blRwbC5hcnJvd1JpZ2h0KVxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0XHRcdC5hdHRyKFwiaWRcIiwgXCJmYW5jeWJveC1jb250YWluZXItXCIgKyBzZWxmLmlkKVxuXHRcdFx0XHQuYWRkQ2xhc3MoZmlyc3RJdGVtT3B0cy5iYXNlQ2xhc3MpXG5cdFx0XHRcdC5kYXRhKFwiRmFuY3lCb3hcIiwgc2VsZilcblx0XHRcdFx0LmFwcGVuZFRvKGZpcnN0SXRlbU9wdHMucGFyZW50RWwpO1xuXG5cdFx0XHQvLyBDcmVhdGUgb2JqZWN0IGhvbGRpbmcgcmVmZXJlbmNlcyB0byBqUXVlcnkgd3JhcHBlZCBub2Rlc1xuXHRcdFx0c2VsZi4kcmVmcyA9IHtcblx0XHRcdFx0Y29udGFpbmVyOiAkY29udGFpbmVyXG5cdFx0XHR9O1xuXG5cdFx0XHRbXCJiZ1wiLCBcImlubmVyXCIsIFwiaW5mb2JhclwiLCBcInRvb2xiYXJcIiwgXCJzdGFnZVwiLCBcImNhcHRpb25cIiwgXCJuYXZpZ2F0aW9uXCJdLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRzZWxmLiRyZWZzW2l0ZW1dID0gJGNvbnRhaW5lci5maW5kKFwiLmZhbmN5Ym94LVwiICsgaXRlbSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0c2VsZi50cmlnZ2VyKFwib25Jbml0XCIpO1xuXG5cdFx0XHQvLyBFbmFibGUgZXZlbnRzLCBkZWFjdGl2ZSBwcmV2aW91cyBpbnN0YW5jZXNcblx0XHRcdHNlbGYuYWN0aXZhdGUoKTtcblxuXHRcdFx0Ly8gQnVpbGQgc2xpZGVzLCBsb2FkIGFuZCByZXZlYWwgY29udGVudFxuXHRcdFx0c2VsZi5qdW1wVG8oc2VsZi5jdXJySW5kZXgpO1xuXHRcdH0sXG5cblx0XHQvLyBTaW1wbGUgaTE4biBzdXBwb3J0IC0gcmVwbGFjZXMgb2JqZWN0IGtleXMgZm91bmQgaW4gdGVtcGxhdGVcblx0XHQvLyB3aXRoIGNvcnJlc3BvbmRpbmcgdmFsdWVzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHR0cmFuc2xhdGU6IGZ1bmN0aW9uKG9iaiwgc3RyKSB7XG5cdFx0XHR2YXIgYXJyID0gb2JqLm9wdHMuaTE4bltvYmoub3B0cy5sYW5nXSB8fCBvYmoub3B0cy5pMThuLmVuO1xuXG5cdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xce1xceyhcXHcrKVxcfVxcfS9nLCBmdW5jdGlvbihtYXRjaCwgbikge1xuXHRcdFx0XHR2YXIgdmFsdWUgPSBhcnJbbl07XG5cblx0XHRcdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Ly8gUG9wdWxhdGUgY3VycmVudCBncm91cCB3aXRoIGZyZXNoIGNvbnRlbnRcblx0XHQvLyBDaGVjayBpZiBlYWNoIG9iamVjdCBoYXMgdmFsaWQgdHlwZSBhbmQgY29udGVudFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRhZGRDb250ZW50OiBmdW5jdGlvbihjb250ZW50KSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGl0ZW1zID0gJC5tYWtlQXJyYXkoY29udGVudCksXG5cdFx0XHRcdHRodW1icztcblxuXHRcdFx0JC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpLCBpdGVtKSB7XG5cdFx0XHRcdHZhciBvYmogPSB7fSxcblx0XHRcdFx0XHRvcHRzID0ge30sXG5cdFx0XHRcdFx0JGl0ZW0sXG5cdFx0XHRcdFx0dHlwZSxcblx0XHRcdFx0XHRmb3VuZCxcblx0XHRcdFx0XHRzcmMsXG5cdFx0XHRcdFx0c3JjUGFydHM7XG5cblx0XHRcdFx0Ly8gU3RlcCAxIC0gTWFrZSBzdXJlIHdlIGhhdmUgYW4gb2JqZWN0XG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRcdGlmICgkLmlzUGxhaW5PYmplY3QoaXRlbSkpIHtcblx0XHRcdFx0XHQvLyBXZSBwcm9iYWJseSBoYXZlIG1hbnVhbCB1c2FnZSBoZXJlLCBzb21ldGhpbmcgbGlrZVxuXHRcdFx0XHRcdC8vICQuZmFuY3lib3gub3BlbiggWyB7IHNyYyA6IFwiaW1hZ2UuanBnXCIsIHR5cGUgOiBcImltYWdlXCIgfSBdIClcblxuXHRcdFx0XHRcdG9iaiA9IGl0ZW07XG5cdFx0XHRcdFx0b3B0cyA9IGl0ZW0ub3B0cyB8fCBpdGVtO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCQudHlwZShpdGVtKSA9PT0gXCJvYmplY3RcIiAmJiAkKGl0ZW0pLmxlbmd0aCkge1xuXHRcdFx0XHRcdC8vIEhlcmUgd2UgcHJvYmFibHkgaGF2ZSBqUXVlcnkgY29sbGVjdGlvbiByZXR1cm5lZCBieSBzb21lIHNlbGVjdG9yXG5cdFx0XHRcdFx0JGl0ZW0gPSAkKGl0ZW0pO1xuXG5cdFx0XHRcdFx0Ly8gU3VwcG9ydCBhdHRyaWJ1dGVzIGxpa2UgYGRhdGEtb3B0aW9ucz0ne1widG91Y2hcIiA6IGZhbHNlfSdgIGFuZCBgZGF0YS10b3VjaD0nZmFsc2UnYFxuXHRcdFx0XHRcdG9wdHMgPSAkaXRlbS5kYXRhKCkgfHwge307XG5cdFx0XHRcdFx0b3B0cyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBvcHRzLCBvcHRzLm9wdGlvbnMpO1xuXG5cdFx0XHRcdFx0Ly8gSGVyZSB3ZSBzdG9yZSBjbGlja2VkIGVsZW1lbnRcblx0XHRcdFx0XHRvcHRzLiRvcmlnID0gJGl0ZW07XG5cblx0XHRcdFx0XHRvYmouc3JjID0gc2VsZi5vcHRzLnNyYyB8fCBvcHRzLnNyYyB8fCAkaXRlbS5hdHRyKFwiaHJlZlwiKTtcblxuXHRcdFx0XHRcdC8vIEFzc3VtZSB0aGF0IHNpbXBsZSBzeW50YXggaXMgdXNlZCwgZm9yIGV4YW1wbGU6XG5cdFx0XHRcdFx0Ly8gICBgJC5mYW5jeWJveC5vcGVuKCAkKFwiI3Rlc3RcIiksIHt9ICk7YFxuXHRcdFx0XHRcdGlmICghb2JqLnR5cGUgJiYgIW9iai5zcmMpIHtcblx0XHRcdFx0XHRcdG9iai50eXBlID0gXCJpbmxpbmVcIjtcblx0XHRcdFx0XHRcdG9iai5zcmMgPSBpdGVtO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBBc3N1bWUgd2UgaGF2ZSBhIHNpbXBsZSBodG1sIGNvZGUsIGZvciBleGFtcGxlOlxuXHRcdFx0XHRcdC8vICAgJC5mYW5jeWJveC5vcGVuKCAnPGRpdj48aDE+SGkhPC9oMT48L2Rpdj4nICk7XG5cdFx0XHRcdFx0b2JqID0ge1xuXHRcdFx0XHRcdFx0dHlwZTogXCJodG1sXCIsXG5cdFx0XHRcdFx0XHRzcmM6IGl0ZW0gKyBcIlwiXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEVhY2ggZ2FsbGVyeSBvYmplY3QgaGFzIGZ1bGwgY29sbGVjdGlvbiBvZiBvcHRpb25zXG5cdFx0XHRcdG9iai5vcHRzID0gJC5leHRlbmQodHJ1ZSwge30sIHNlbGYub3B0cywgb3B0cyk7XG5cblx0XHRcdFx0Ly8gRG8gbm90IG1lcmdlIGJ1dHRvbnMgYXJyYXlcblx0XHRcdFx0aWYgKCQuaXNBcnJheShvcHRzLmJ1dHRvbnMpKSB7XG5cdFx0XHRcdFx0b2JqLm9wdHMuYnV0dG9ucyA9IG9wdHMuYnV0dG9ucztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICgkLmZhbmN5Ym94LmlzTW9iaWxlICYmIG9iai5vcHRzLm1vYmlsZSkge1xuXHRcdFx0XHRcdG9iai5vcHRzID0gbWVyZ2VPcHRzKG9iai5vcHRzLCBvYmoub3B0cy5tb2JpbGUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gU3RlcCAyIC0gTWFrZSBzdXJlIHdlIGhhdmUgY29udGVudCB0eXBlLCBpZiBub3QgLSB0cnkgdG8gZ3Vlc3Ncblx0XHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdFx0XHR0eXBlID0gb2JqLnR5cGUgfHwgb2JqLm9wdHMudHlwZTtcblx0XHRcdFx0c3JjID0gb2JqLnNyYyB8fCBcIlwiO1xuXG5cdFx0XHRcdGlmICghdHlwZSAmJiBzcmMpIHtcblx0XHRcdFx0XHRpZiAoKGZvdW5kID0gc3JjLm1hdGNoKC9cXC4obXA0fG1vdnxvZ3Z8d2VibSkoKFxcP3wjKS4qKT8kL2kpKSkge1xuXHRcdFx0XHRcdFx0dHlwZSA9IFwidmlkZW9cIjtcblxuXHRcdFx0XHRcdFx0aWYgKCFvYmoub3B0cy52aWRlby5mb3JtYXQpIHtcblx0XHRcdFx0XHRcdFx0b2JqLm9wdHMudmlkZW8uZm9ybWF0ID0gXCJ2aWRlby9cIiArIChmb3VuZFsxXSA9PT0gXCJvZ3ZcIiA/IFwib2dnXCIgOiBmb3VuZFsxXSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzcmMubWF0Y2goLyheZGF0YTppbWFnZVxcL1thLXowLTkrXFwvPV0qLCl8KFxcLihqcChlfGd8ZWcpfGdpZnxwbmd8Ym1wfHdlYnB8c3ZnfGljbykoKFxcP3wjKS4qKT8kKS9pKSkge1xuXHRcdFx0XHRcdFx0dHlwZSA9IFwiaW1hZ2VcIjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHNyYy5tYXRjaCgvXFwuKHBkZikoKFxcP3wjKS4qKT8kL2kpKSB7XG5cdFx0XHRcdFx0XHR0eXBlID0gXCJpZnJhbWVcIjtcblx0XHRcdFx0XHRcdG9iaiA9ICQuZXh0ZW5kKHRydWUsIG9iaiwge2NvbnRlbnRUeXBlOiBcInBkZlwiLCBvcHRzOiB7aWZyYW1lOiB7cHJlbG9hZDogZmFsc2V9fX0pO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc3JjLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcblx0XHRcdFx0XHRcdHR5cGUgPSBcImlubGluZVwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh0eXBlKSB7XG5cdFx0XHRcdFx0b2JqLnR5cGUgPSB0eXBlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGYudHJpZ2dlcihcIm9iamVjdE5lZWRzVHlwZVwiLCBvYmopO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCFvYmouY29udGVudFR5cGUpIHtcblx0XHRcdFx0XHRvYmouY29udGVudFR5cGUgPSAkLmluQXJyYXkob2JqLnR5cGUsIFtcImh0bWxcIiwgXCJpbmxpbmVcIiwgXCJhamF4XCJdKSA+IC0xID8gXCJodG1sXCIgOiBvYmoudHlwZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFN0ZXAgMyAtIFNvbWUgYWRqdXN0bWVudHNcblx0XHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRcdG9iai5pbmRleCA9IHNlbGYuZ3JvdXAubGVuZ3RoO1xuXG5cdFx0XHRcdGlmIChvYmoub3B0cy5zbWFsbEJ0biA9PSBcImF1dG9cIikge1xuXHRcdFx0XHRcdG9iai5vcHRzLnNtYWxsQnRuID0gJC5pbkFycmF5KG9iai50eXBlLCBbXCJodG1sXCIsIFwiaW5saW5lXCIsIFwiYWpheFwiXSkgPiAtMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChvYmoub3B0cy50b29sYmFyID09PSBcImF1dG9cIikge1xuXHRcdFx0XHRcdG9iai5vcHRzLnRvb2xiYXIgPSAhb2JqLm9wdHMuc21hbGxCdG47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBGaW5kIHRodW1ibmFpbCBpbWFnZSwgY2hlY2sgaWYgZXhpc3RzIGFuZCBpZiBpcyBpbiB0aGUgdmlld3BvcnRcblx0XHRcdFx0b2JqLiR0aHVtYiA9IG9iai5vcHRzLiR0aHVtYiB8fCBudWxsO1xuXG5cdFx0XHRcdGlmIChvYmoub3B0cy4kdHJpZ2dlciAmJiBvYmouaW5kZXggPT09IHNlbGYub3B0cy5pbmRleCkge1xuXHRcdFx0XHRcdG9iai4kdGh1bWIgPSBvYmoub3B0cy4kdHJpZ2dlci5maW5kKFwiaW1nOmZpcnN0XCIpO1xuXG5cdFx0XHRcdFx0aWYgKG9iai4kdGh1bWIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRvYmoub3B0cy4kb3JpZyA9IG9iai5vcHRzLiR0cmlnZ2VyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghKG9iai4kdGh1bWIgJiYgb2JqLiR0aHVtYi5sZW5ndGgpICYmIG9iai5vcHRzLiRvcmlnKSB7XG5cdFx0XHRcdFx0b2JqLiR0aHVtYiA9IG9iai5vcHRzLiRvcmlnLmZpbmQoXCJpbWc6Zmlyc3RcIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAob2JqLiR0aHVtYiAmJiAhb2JqLiR0aHVtYi5sZW5ndGgpIHtcblx0XHRcdFx0XHRvYmouJHRodW1iID0gbnVsbDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9iai50aHVtYiA9IG9iai5vcHRzLnRodW1iIHx8IChvYmouJHRodW1iID8gb2JqLiR0aHVtYlswXS5zcmMgOiBudWxsKTtcblxuXHRcdFx0XHQvLyBcImNhcHRpb25cIiBpcyBhIFwic3BlY2lhbFwiIG9wdGlvbiwgaXQgY2FuIGJlIHVzZWQgdG8gY3VzdG9taXplIGNhcHRpb24gcGVyIGdhbGxlcnkgaXRlbVxuXHRcdFx0XHRpZiAoJC50eXBlKG9iai5vcHRzLmNhcHRpb24pID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHRvYmoub3B0cy5jYXB0aW9uID0gb2JqLm9wdHMuY2FwdGlvbi5hcHBseShpdGVtLCBbc2VsZiwgb2JqXSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoJC50eXBlKHNlbGYub3B0cy5jYXB0aW9uKSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0b2JqLm9wdHMuY2FwdGlvbiA9IHNlbGYub3B0cy5jYXB0aW9uLmFwcGx5KGl0ZW0sIFtzZWxmLCBvYmpdKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIE1ha2Ugc3VyZSB3ZSBoYXZlIGNhcHRpb24gYXMgYSBzdHJpbmcgb3IgalF1ZXJ5IG9iamVjdFxuXHRcdFx0XHRpZiAoIShvYmoub3B0cy5jYXB0aW9uIGluc3RhbmNlb2YgJCkpIHtcblx0XHRcdFx0XHRvYmoub3B0cy5jYXB0aW9uID0gb2JqLm9wdHMuY2FwdGlvbiA9PT0gdW5kZWZpbmVkID8gXCJcIiA6IG9iai5vcHRzLmNhcHRpb24gKyBcIlwiO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdXJsIGNvbnRhaW5zIFwiZmlsdGVyXCIgdXNlZCB0byBmaWx0ZXIgdGhlIGNvbnRlbnRcblx0XHRcdFx0Ly8gRXhhbXBsZTogXCJhamF4Lmh0bWwgI3NvbWV0aGluZ1wiXG5cdFx0XHRcdGlmIChvYmoudHlwZSA9PT0gXCJhamF4XCIpIHtcblx0XHRcdFx0XHRzcmNQYXJ0cyA9IHNyYy5zcGxpdCgvXFxzKy8sIDIpO1xuXG5cdFx0XHRcdFx0aWYgKHNyY1BhcnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdFx0XHRcdG9iai5zcmMgPSBzcmNQYXJ0cy5zaGlmdCgpO1xuXG5cdFx0XHRcdFx0XHRvYmoub3B0cy5maWx0ZXIgPSBzcmNQYXJ0cy5zaGlmdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEhpZGUgYWxsIGJ1dHRvbnMgYW5kIGRpc2FibGUgaW50ZXJhY3Rpdml0eSBmb3IgbW9kYWwgaXRlbXNcblx0XHRcdFx0aWYgKG9iai5vcHRzLm1vZGFsKSB7XG5cdFx0XHRcdFx0b2JqLm9wdHMgPSAkLmV4dGVuZCh0cnVlLCBvYmoub3B0cywge1xuXHRcdFx0XHRcdFx0dHJhcEZvY3VzOiB0cnVlLFxuXHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIGJ1dHRvbnNcblx0XHRcdFx0XHRcdGluZm9iYXI6IDAsXG5cdFx0XHRcdFx0XHR0b29sYmFyOiAwLFxuXG5cdFx0XHRcdFx0XHRzbWFsbEJ0bjogMCxcblxuXHRcdFx0XHRcdFx0Ly8gRGlzYWJsZSBrZXlib2FyZCBuYXZpZ2F0aW9uXG5cdFx0XHRcdFx0XHRrZXlib2FyZDogMCxcblxuXHRcdFx0XHRcdFx0Ly8gRGlzYWJsZSBzb21lIG1vZHVsZXNcblx0XHRcdFx0XHRcdHNsaWRlU2hvdzogMCxcblx0XHRcdFx0XHRcdGZ1bGxTY3JlZW46IDAsXG5cdFx0XHRcdFx0XHR0aHVtYnM6IDAsXG5cdFx0XHRcdFx0XHR0b3VjaDogMCxcblxuXHRcdFx0XHRcdFx0Ly8gRGlzYWJsZSBjbGljayBldmVudCBoYW5kbGVyc1xuXHRcdFx0XHRcdFx0Y2xpY2tDb250ZW50OiBmYWxzZSxcblx0XHRcdFx0XHRcdGNsaWNrU2xpZGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0Y2xpY2tPdXRzaWRlOiBmYWxzZSxcblx0XHRcdFx0XHRcdGRibGNsaWNrQ29udGVudDogZmFsc2UsXG5cdFx0XHRcdFx0XHRkYmxjbGlja1NsaWRlOiBmYWxzZSxcblx0XHRcdFx0XHRcdGRibGNsaWNrT3V0c2lkZTogZmFsc2Vcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFN0ZXAgNCAtIEFkZCBwcm9jZXNzZWQgb2JqZWN0IHRvIGdyb3VwXG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdFx0c2VsZi5ncm91cC5wdXNoKG9iaik7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gVXBkYXRlIGNvbnRyb2xzIGlmIGdhbGxlcnkgaXMgYWxyZWFkeSBvcGVuZWRcblx0XHRcdGlmIChPYmplY3Qua2V5cyhzZWxmLnNsaWRlcykubGVuZ3RoKSB7XG5cdFx0XHRcdHNlbGYudXBkYXRlQ29udHJvbHMoKTtcblxuXHRcdFx0XHQvLyBVcGRhdGUgdGh1bWJuYWlscywgaWYgbmVlZGVkXG5cdFx0XHRcdHRodW1icyA9IHNlbGYuVGh1bWJzO1xuXG5cdFx0XHRcdGlmICh0aHVtYnMgJiYgdGh1bWJzLmlzQWN0aXZlKSB7XG5cdFx0XHRcdFx0dGh1bWJzLmNyZWF0ZSgpO1xuXG5cdFx0XHRcdFx0dGh1bWJzLmZvY3VzKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gQXR0YWNoIGFuIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25zIGZvcjpcblx0XHQvLyAgIC0gbmF2aWdhdGlvbiBidXR0b25zXG5cdFx0Ly8gICAtIGJyb3dzZXIgc2Nyb2xsaW5nLCByZXNpemluZztcblx0XHQvLyAgIC0gZm9jdXNpbmdcblx0XHQvLyAgIC0ga2V5Ym9hcmRcblx0XHQvLyAgIC0gZGV0ZWN0aW5nIGluYWN0aXZpdHlcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YWRkRXZlbnRzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0c2VsZi5yZW1vdmVFdmVudHMoKTtcblxuXHRcdFx0Ly8gTWFrZSBuYXZpZ2F0aW9uIGVsZW1lbnRzIGNsaWNrYWJsZVxuXHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lclxuXHRcdFx0XHQub24oXCJjbGljay5mYi1jbG9zZVwiLCBcIltkYXRhLWZhbmN5Ym94LWNsb3NlXVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRzZWxmLmNsb3NlKGUpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oXCJ0b3VjaHN0YXJ0LmZiLXByZXYgY2xpY2suZmItcHJldlwiLCBcIltkYXRhLWZhbmN5Ym94LXByZXZdXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdHNlbGYucHJldmlvdXMoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKFwidG91Y2hzdGFydC5mYi1uZXh0IGNsaWNrLmZiLW5leHRcIiwgXCJbZGF0YS1mYW5jeWJveC1uZXh0XVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRzZWxmLm5leHQoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKFwiY2xpY2suZmJcIiwgXCJbZGF0YS1mYW5jeWJveC16b29tXVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0Ly8gQ2xpY2sgaGFuZGxlciBmb3Igem9vbSBidXR0b25cblx0XHRcdFx0XHRzZWxmW3NlbGYuaXNTY2FsZWREb3duKCkgPyBcInNjYWxlVG9BY3R1YWxcIiA6IFwic2NhbGVUb0ZpdFwiXSgpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0Ly8gSGFuZGxlIHBhZ2Ugc2Nyb2xsaW5nIGFuZCBicm93c2VyIHJlc2l6aW5nXG5cdFx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdFx0JFcub24oXCJvcmllbnRhdGlvbmNoYW5nZS5mYiByZXNpemUuZmJcIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRpZiAoZSAmJiBlLm9yaWdpbmFsRXZlbnQgJiYgZS5vcmlnaW5hbEV2ZW50LnR5cGUgPT09IFwicmVzaXplXCIpIHtcblx0XHRcdFx0XHRpZiAoc2VsZi5yZXF1ZXN0SWQpIHtcblx0XHRcdFx0XHRcdGNhbmNlbEFGcmFtZShzZWxmLnJlcXVlc3RJZCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2VsZi5yZXF1ZXN0SWQgPSByZXF1ZXN0QUZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0c2VsZi51cGRhdGUoZSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKHNlbGYuY3VycmVudCAmJiBzZWxmLmN1cnJlbnQudHlwZSA9PT0gXCJpZnJhbWVcIikge1xuXHRcdFx0XHRcdFx0c2VsZi4kcmVmcy5zdGFnZS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHNlbGYuJHJlZnMuc3RhZ2Uuc2hvdygpO1xuXG5cdFx0XHRcdFx0XHRzZWxmLnVwZGF0ZShlKTtcblx0XHRcdFx0XHR9LCAkLmZhbmN5Ym94LmlzTW9iaWxlID8gNjAwIDogMjUwKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdCRELm9uKFwia2V5ZG93bi5mYlwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciBpbnN0YW5jZSA9ICQuZmFuY3lib3ggPyAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCkgOiBudWxsLFxuXHRcdFx0XHRcdGN1cnJlbnQgPSBpbnN0YW5jZS5jdXJyZW50LFxuXHRcdFx0XHRcdGtleWNvZGUgPSBlLmtleUNvZGUgfHwgZS53aGljaDtcblxuXHRcdFx0XHQvLyBUcmFwIGtleWJvYXJkIGZvY3VzIGluc2lkZSBvZiB0aGUgbW9kYWxcblx0XHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdFx0aWYgKGtleWNvZGUgPT0gOSkge1xuXHRcdFx0XHRcdGlmIChjdXJyZW50Lm9wdHMudHJhcEZvY3VzKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmZvY3VzKGUpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEVuYWJsZSBrZXlib2FyZCBuYXZpZ2F0aW9uXG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdFx0aWYgKCFjdXJyZW50Lm9wdHMua2V5Ym9hcmQgfHwgZS5jdHJsS2V5IHx8IGUuYWx0S2V5IHx8IGUuc2hpZnRLZXkgfHwgJChlLnRhcmdldCkuaXMoXCJpbnB1dFwiKSB8fCAkKGUudGFyZ2V0KS5pcyhcInRleHRhcmVhXCIpKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQmFja3NwYWNlIGFuZCBFc2Mga2V5c1xuXHRcdFx0XHRpZiAoa2V5Y29kZSA9PT0gOCB8fCBrZXljb2RlID09PSAyNykge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdHNlbGYuY2xvc2UoZSk7XG5cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBMZWZ0IGFycm93IGFuZCBVcCBhcnJvd1xuXHRcdFx0XHRpZiAoa2V5Y29kZSA9PT0gMzcgfHwga2V5Y29kZSA9PT0gMzgpIHtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRzZWxmLnByZXZpb3VzKCk7XG5cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSaWdoIGFycm93IGFuZCBEb3duIGFycm93XG5cdFx0XHRcdGlmIChrZXljb2RlID09PSAzOSB8fCBrZXljb2RlID09PSA0MCkge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdHNlbGYubmV4dCgpO1xuXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VsZi50cmlnZ2VyKFwiYWZ0ZXJLZXlkb3duXCIsIGUsIGtleWNvZGUpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIEhpZGUgY29udHJvbHMgYWZ0ZXIgc29tZSBpbmFjdGl2aXR5IHBlcmlvZFxuXHRcdFx0aWYgKHNlbGYuZ3JvdXBbc2VsZi5jdXJySW5kZXhdLm9wdHMuaWRsZVRpbWUpIHtcblx0XHRcdFx0c2VsZi5pZGxlU2Vjb25kc0NvdW50ZXIgPSAwO1xuXG5cdFx0XHRcdCRELm9uKFxuXHRcdFx0XHRcdFwibW91c2Vtb3ZlLmZiLWlkbGUgbW91c2VsZWF2ZS5mYi1pZGxlIG1vdXNlZG93bi5mYi1pZGxlIHRvdWNoc3RhcnQuZmItaWRsZSB0b3VjaG1vdmUuZmItaWRsZSBzY3JvbGwuZmItaWRsZSBrZXlkb3duLmZiLWlkbGVcIixcblx0XHRcdFx0XHRmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmlkbGVTZWNvbmRzQ291bnRlciA9IDA7XG5cblx0XHRcdFx0XHRcdGlmIChzZWxmLmlzSWRsZSkge1xuXHRcdFx0XHRcdFx0XHRzZWxmLnNob3dDb250cm9scygpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzZWxmLmlzSWRsZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblxuXHRcdFx0XHRzZWxmLmlkbGVJbnRlcnZhbCA9IHdpbmRvdy5zZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLmlkbGVTZWNvbmRzQ291bnRlcisrO1xuXG5cdFx0XHRcdFx0aWYgKHNlbGYuaWRsZVNlY29uZHNDb3VudGVyID49IHNlbGYuZ3JvdXBbc2VsZi5jdXJySW5kZXhdLm9wdHMuaWRsZVRpbWUgJiYgIXNlbGYuaXNEcmFnZ2luZykge1xuXHRcdFx0XHRcdFx0c2VsZi5pc0lkbGUgPSB0cnVlO1xuXHRcdFx0XHRcdFx0c2VsZi5pZGxlU2Vjb25kc0NvdW50ZXIgPSAwO1xuXG5cdFx0XHRcdFx0XHRzZWxmLmhpZGVDb250cm9scygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIFJlbW92ZSBldmVudHMgYWRkZWQgYnkgdGhlIGNvcmVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRyZW1vdmVFdmVudHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHQkVy5vZmYoXCJvcmllbnRhdGlvbmNoYW5nZS5mYiByZXNpemUuZmJcIik7XG5cdFx0XHQkRC5vZmYoXCJrZXlkb3duLmZiIC5mYi1pZGxlXCIpO1xuXG5cdFx0XHR0aGlzLiRyZWZzLmNvbnRhaW5lci5vZmYoXCIuZmItY2xvc2UgLmZiLXByZXYgLmZiLW5leHRcIik7XG5cblx0XHRcdGlmIChzZWxmLmlkbGVJbnRlcnZhbCkge1xuXHRcdFx0XHR3aW5kb3cuY2xlYXJJbnRlcnZhbChzZWxmLmlkbGVJbnRlcnZhbCk7XG5cblx0XHRcdFx0c2VsZi5pZGxlSW50ZXJ2YWwgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBDaGFuZ2UgdG8gcHJldmlvdXMgZ2FsbGVyeSBpdGVtXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0cHJldmlvdXM6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5qdW1wVG8odGhpcy5jdXJyUG9zIC0gMSwgZHVyYXRpb24pO1xuXHRcdH0sXG5cblx0XHQvLyBDaGFuZ2UgdG8gbmV4dCBnYWxsZXJ5IGl0ZW1cblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdG5leHQ6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5qdW1wVG8odGhpcy5jdXJyUG9zICsgMSwgZHVyYXRpb24pO1xuXHRcdH0sXG5cblx0XHQvLyBTd2l0Y2ggdG8gc2VsZWN0ZWQgZ2FsbGVyeSBpdGVtXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0anVtcFRvOiBmdW5jdGlvbihwb3MsIGR1cmF0aW9uKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGdyb3VwTGVuID0gc2VsZi5ncm91cC5sZW5ndGgsXG5cdFx0XHRcdGZpcnN0UnVuLFxuXHRcdFx0XHRpc01vdmVkLFxuXHRcdFx0XHRsb29wLFxuXHRcdFx0XHRjdXJyZW50LFxuXHRcdFx0XHRwcmV2aW91cyxcblx0XHRcdFx0c2xpZGVQb3MsXG5cdFx0XHRcdHN0YWdlUG9zLFxuXHRcdFx0XHRwcm9wLFxuXHRcdFx0XHRkaWZmO1xuXG5cdFx0XHRpZiAoc2VsZi5pc0RyYWdnaW5nIHx8IHNlbGYuaXNDbG9zaW5nIHx8IChzZWxmLmlzQW5pbWF0aW5nICYmIHNlbGYuZmlyc3RSdW4pKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2hvdWxkIGxvb3A/XG5cdFx0XHRwb3MgPSBwYXJzZUludChwb3MsIDEwKTtcblx0XHRcdGxvb3AgPSBzZWxmLmN1cnJlbnQgPyBzZWxmLmN1cnJlbnQub3B0cy5sb29wIDogc2VsZi5vcHRzLmxvb3A7XG5cblx0XHRcdGlmICghbG9vcCAmJiAocG9zIDwgMCB8fCBwb3MgPj0gZ3JvdXBMZW4pKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ2hlY2sgaWYgb3BlbmluZyBmb3IgdGhlIGZpcnN0IHRpbWU7IHRoaXMgaGVscHMgdG8gc3BlZWQgdGhpbmdzIHVwXG5cdFx0XHRmaXJzdFJ1biA9IHNlbGYuZmlyc3RSdW4gPSAhT2JqZWN0LmtleXMoc2VsZi5zbGlkZXMpLmxlbmd0aDtcblxuXHRcdFx0Ly8gQ3JlYXRlIHNsaWRlc1xuXHRcdFx0cHJldmlvdXMgPSBzZWxmLmN1cnJlbnQ7XG5cblx0XHRcdHNlbGYucHJldkluZGV4ID0gc2VsZi5jdXJySW5kZXg7XG5cdFx0XHRzZWxmLnByZXZQb3MgPSBzZWxmLmN1cnJQb3M7XG5cblx0XHRcdGN1cnJlbnQgPSBzZWxmLmNyZWF0ZVNsaWRlKHBvcyk7XG5cblx0XHRcdGlmIChncm91cExlbiA+IDEpIHtcblx0XHRcdFx0aWYgKGxvb3AgfHwgY3VycmVudC5pbmRleCA8IGdyb3VwTGVuIC0gMSkge1xuXHRcdFx0XHRcdHNlbGYuY3JlYXRlU2xpZGUocG9zICsgMSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobG9vcCB8fCBjdXJyZW50LmluZGV4ID4gMCkge1xuXHRcdFx0XHRcdHNlbGYuY3JlYXRlU2xpZGUocG9zIC0gMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2VsZi5jdXJyZW50ID0gY3VycmVudDtcblx0XHRcdHNlbGYuY3VyckluZGV4ID0gY3VycmVudC5pbmRleDtcblx0XHRcdHNlbGYuY3VyclBvcyA9IGN1cnJlbnQucG9zO1xuXG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJiZWZvcmVTaG93XCIsIGZpcnN0UnVuKTtcblxuXHRcdFx0c2VsZi51cGRhdGVDb250cm9scygpO1xuXG5cdFx0XHQvLyBWYWxpZGF0ZSBkdXJhdGlvbiBsZW5ndGhcblx0XHRcdGN1cnJlbnQuZm9yY2VkRHVyYXRpb24gPSB1bmRlZmluZWQ7XG5cblx0XHRcdGlmICgkLmlzTnVtZXJpYyhkdXJhdGlvbikpIHtcblx0XHRcdFx0Y3VycmVudC5mb3JjZWREdXJhdGlvbiA9IGR1cmF0aW9uO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBjdXJyZW50Lm9wdHNbZmlyc3RSdW4gPyBcImFuaW1hdGlvbkR1cmF0aW9uXCIgOiBcInRyYW5zaXRpb25EdXJhdGlvblwiXTtcblx0XHRcdH1cblxuXHRcdFx0ZHVyYXRpb24gPSBwYXJzZUludChkdXJhdGlvbiwgMTApO1xuXG5cdFx0XHQvLyBDaGVjayBpZiB1c2VyIGhhcyBzd2lwZWQgdGhlIHNsaWRlcyBvciBpZiBzdGlsbCBhbmltYXRpbmdcblx0XHRcdGlzTW92ZWQgPSBzZWxmLmlzTW92ZWQoY3VycmVudCk7XG5cblx0XHRcdC8vIE1ha2Ugc3VyZSBjdXJyZW50IHNsaWRlIGlzIHZpc2libGVcblx0XHRcdGN1cnJlbnQuJHNsaWRlLmFkZENsYXNzKFwiZmFuY3lib3gtc2xpZGUtLWN1cnJlbnRcIik7XG5cblx0XHRcdC8vIEZyZXNoIHN0YXJ0IC0gcmV2ZWFsIGNvbnRhaW5lciwgY3VycmVudCBzbGlkZSBhbmQgc3RhcnQgbG9hZGluZyBjb250ZW50XG5cdFx0XHRpZiAoZmlyc3RSdW4pIHtcblx0XHRcdFx0aWYgKGN1cnJlbnQub3B0cy5hbmltYXRpb25FZmZlY3QgJiYgZHVyYXRpb24pIHtcblx0XHRcdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lci5jc3MoXCJ0cmFuc2l0aW9uLWR1cmF0aW9uXCIsIGR1cmF0aW9uICsgXCJtc1wiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNlbGYuJHJlZnMuY29udGFpbmVyLmFkZENsYXNzKFwiZmFuY3lib3gtaXMtb3BlblwiKS50cmlnZ2VyKFwiZm9jdXNcIik7XG5cblx0XHRcdFx0Ly8gQXR0ZW1wdCB0byBsb2FkIGNvbnRlbnQgaW50byBzbGlkZVxuXHRcdFx0XHQvLyBUaGlzIHdpbGwgbGF0ZXIgY2FsbCBgYWZ0ZXJMb2FkYCAtPiBgcmV2ZWFsQ29udGVudGBcblx0XHRcdFx0c2VsZi5sb2FkU2xpZGUoY3VycmVudCk7XG5cblx0XHRcdFx0c2VsZi5wcmVsb2FkKFwiaW1hZ2VcIik7XG5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBHZXQgYWN0dWFsIHNsaWRlL3N0YWdlIHBvc2l0aW9ucyAoYmVmb3JlIGNsZWFuaW5nIHVwKVxuXHRcdFx0c2xpZGVQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShwcmV2aW91cy4kc2xpZGUpO1xuXHRcdFx0c3RhZ2VQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShzZWxmLiRyZWZzLnN0YWdlKTtcblxuXHRcdFx0Ly8gQ2xlYW4gdXAgYWxsIHNsaWRlc1xuXHRcdFx0JC5lYWNoKHNlbGYuc2xpZGVzLCBmdW5jdGlvbihpbmRleCwgc2xpZGUpIHtcblx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKHNsaWRlLiRzbGlkZSwgdHJ1ZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKHByZXZpb3VzLnBvcyAhPT0gY3VycmVudC5wb3MpIHtcblx0XHRcdFx0cHJldmlvdXMuaXNDb21wbGV0ZSA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRwcmV2aW91cy4kc2xpZGUucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tY29tcGxldGUgZmFuY3lib3gtc2xpZGUtLWN1cnJlbnRcIik7XG5cblx0XHRcdC8vIElmIHNsaWRlcyBhcmUgb3V0IG9mIHBsYWNlLCB0aGVuIGFuaW1hdGUgdGhlbSB0byBjb3JyZWN0IHBvc2l0aW9uXG5cdFx0XHRpZiAoaXNNb3ZlZCkge1xuXHRcdFx0XHQvLyBDYWxjdWxhdGUgaG9yaXpvbnRhbCBzd2lwZSBkaXN0YW5jZVxuXHRcdFx0XHRkaWZmID0gc2xpZGVQb3MubGVmdCAtIChwcmV2aW91cy5wb3MgKiBzbGlkZVBvcy53aWR0aCArIHByZXZpb3VzLnBvcyAqIHByZXZpb3VzLm9wdHMuZ3V0dGVyKTtcblxuXHRcdFx0XHQkLmVhY2goc2VsZi5zbGlkZXMsIGZ1bmN0aW9uKGluZGV4LCBzbGlkZSkge1xuXHRcdFx0XHRcdHNsaWRlLiRzbGlkZS5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWFuaW1hdGVkXCIpLnJlbW92ZUNsYXNzKGZ1bmN0aW9uKGluZGV4LCBjbGFzc05hbWUpIHtcblx0XHRcdFx0XHRcdHJldHVybiAoY2xhc3NOYW1lLm1hdGNoKC8oXnxcXHMpZmFuY3lib3gtZngtXFxTKy9nKSB8fCBbXSkuam9pbihcIiBcIik7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQvLyBNYWtlIHN1cmUgdGhhdCBlYWNoIHNsaWRlIGlzIGluIGVxdWFsIGRpc3RhbmNlXG5cdFx0XHRcdFx0Ly8gVGhpcyBpcyBtb3N0bHkgbmVlZGVkIGZvciBmcmVzaGx5IGFkZGVkIHNsaWRlcywgYmVjYXVzZSB0aGV5IGFyZSBub3QgeWV0IHBvc2l0aW9uZWRcblx0XHRcdFx0XHR2YXIgbGVmdFBvcyA9IHNsaWRlLnBvcyAqIHNsaWRlUG9zLndpZHRoICsgc2xpZGUucG9zICogc2xpZGUub3B0cy5ndXR0ZXI7XG5cblx0XHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZShzbGlkZS4kc2xpZGUsIHt0b3A6IDAsIGxlZnQ6IGxlZnRQb3MgLSBzdGFnZVBvcy5sZWZ0ICsgZGlmZn0pO1xuXG5cdFx0XHRcdFx0aWYgKHNsaWRlLnBvcyAhPT0gY3VycmVudC5wb3MpIHtcblx0XHRcdFx0XHRcdHNsaWRlLiRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1cIiArIChzbGlkZS5wb3MgPiBjdXJyZW50LnBvcyA/IFwibmV4dFwiIDogXCJwcmV2aW91c1wiKSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gUmVkcmF3IHRvIG1ha2Ugc3VyZSB0aGF0IHRyYW5zaXRpb24gd2lsbCBzdGFydFxuXHRcdFx0XHRcdGZvcmNlUmVkcmF3KHNsaWRlLiRzbGlkZSk7XG5cblx0XHRcdFx0XHQvLyBBbmltYXRlIHRoZSBzbGlkZVxuXHRcdFx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0XHRcdHNsaWRlLiRzbGlkZSxcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0dG9wOiAwLFxuXHRcdFx0XHRcdFx0XHRsZWZ0OiAoc2xpZGUucG9zIC0gY3VycmVudC5wb3MpICogc2xpZGVQb3Mud2lkdGggKyAoc2xpZGUucG9zIC0gY3VycmVudC5wb3MpICogc2xpZGUub3B0cy5ndXR0ZXJcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRkdXJhdGlvbixcblx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRzbGlkZS4kc2xpZGVcblx0XHRcdFx0XHRcdFx0XHQuY3NzKHtcblx0XHRcdFx0XHRcdFx0XHRcdHRyYW5zZm9ybTogXCJcIixcblx0XHRcdFx0XHRcdFx0XHRcdG9wYWNpdHk6IFwiXCJcblx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1uZXh0IGZhbmN5Ym94LXNsaWRlLS1wcmV2aW91c1wiKTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBzZWxmLmN1cnJQb3MpIHtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLmNvbXBsZXRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSBpZiAoZHVyYXRpb24gJiYgY3VycmVudC5vcHRzLnRyYW5zaXRpb25FZmZlY3QpIHtcblx0XHRcdFx0Ly8gU2V0IHRyYW5zaXRpb24gZWZmZWN0IGZvciBwcmV2aW91c2x5IGFjdGl2ZSBzbGlkZVxuXHRcdFx0XHRwcm9wID0gXCJmYW5jeWJveC1hbmltYXRlZCBmYW5jeWJveC1meC1cIiArIGN1cnJlbnQub3B0cy50cmFuc2l0aW9uRWZmZWN0O1xuXG5cdFx0XHRcdHByZXZpb3VzLiRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1cIiArIChwcmV2aW91cy5wb3MgPiBjdXJyZW50LnBvcyA/IFwibmV4dFwiIDogXCJwcmV2aW91c1wiKSk7XG5cblx0XHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKFxuXHRcdFx0XHRcdHByZXZpb3VzLiRzbGlkZSxcblx0XHRcdFx0XHRwcm9wLFxuXHRcdFx0XHRcdGR1cmF0aW9uLFxuXHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0cHJldmlvdXMuJHNsaWRlLnJlbW92ZUNsYXNzKHByb3ApLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtc2xpZGUtLW5leHQgZmFuY3lib3gtc2xpZGUtLXByZXZpb3VzXCIpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZmFsc2Vcblx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGN1cnJlbnQuaXNMb2FkZWQpIHtcblx0XHRcdFx0c2VsZi5yZXZlYWxDb250ZW50KGN1cnJlbnQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5sb2FkU2xpZGUoY3VycmVudCk7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYucHJlbG9hZChcImltYWdlXCIpO1xuXHRcdH0sXG5cblx0XHQvLyBDcmVhdGUgbmV3IFwic2xpZGVcIiBlbGVtZW50XG5cdFx0Ly8gVGhlc2UgYXJlIGdhbGxlcnkgaXRlbXMgIHRoYXQgYXJlIGFjdHVhbGx5IGFkZGVkIHRvIERPTVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGNyZWF0ZVNsaWRlOiBmdW5jdGlvbihwb3MpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JHNsaWRlLFxuXHRcdFx0XHRpbmRleDtcblxuXHRcdFx0aW5kZXggPSBwb3MgJSBzZWxmLmdyb3VwLmxlbmd0aDtcblx0XHRcdGluZGV4ID0gaW5kZXggPCAwID8gc2VsZi5ncm91cC5sZW5ndGggKyBpbmRleCA6IGluZGV4O1xuXG5cdFx0XHRpZiAoIXNlbGYuc2xpZGVzW3Bvc10gJiYgc2VsZi5ncm91cFtpbmRleF0pIHtcblx0XHRcdFx0JHNsaWRlID0gJCgnPGRpdiBjbGFzcz1cImZhbmN5Ym94LXNsaWRlXCI+PC9kaXY+JykuYXBwZW5kVG8oc2VsZi4kcmVmcy5zdGFnZSk7XG5cblx0XHRcdFx0c2VsZi5zbGlkZXNbcG9zXSA9ICQuZXh0ZW5kKHRydWUsIHt9LCBzZWxmLmdyb3VwW2luZGV4XSwge1xuXHRcdFx0XHRcdHBvczogcG9zLFxuXHRcdFx0XHRcdCRzbGlkZTogJHNsaWRlLFxuXHRcdFx0XHRcdGlzTG9hZGVkOiBmYWxzZVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzZWxmLnVwZGF0ZVNsaWRlKHNlbGYuc2xpZGVzW3Bvc10pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gc2VsZi5zbGlkZXNbcG9zXTtcblx0XHR9LFxuXG5cdFx0Ly8gU2NhbGUgaW1hZ2UgdG8gdGhlIGFjdHVhbCBzaXplIG9mIHRoZSBpbWFnZTtcblx0XHQvLyB4IGFuZCB5IHZhbHVlcyBzaG91bGQgYmUgcmVsYXRpdmUgdG8gdGhlIHNsaWRlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2NhbGVUb0FjdHVhbDogZnVuY3Rpb24oeCwgeSwgZHVyYXRpb24pIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0JGNvbnRlbnQgPSBjdXJyZW50LiRjb250ZW50LFxuXHRcdFx0XHRjYW52YXNXaWR0aCA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKGN1cnJlbnQuJHNsaWRlKS53aWR0aCxcblx0XHRcdFx0Y2FudmFzSGVpZ2h0ID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoY3VycmVudC4kc2xpZGUpLmhlaWdodCxcblx0XHRcdFx0bmV3SW1nV2lkdGggPSBjdXJyZW50LndpZHRoLFxuXHRcdFx0XHRuZXdJbWdIZWlnaHQgPSBjdXJyZW50LmhlaWdodCxcblx0XHRcdFx0aW1nUG9zLFxuXHRcdFx0XHRwb3NYLFxuXHRcdFx0XHRwb3NZLFxuXHRcdFx0XHRzY2FsZVgsXG5cdFx0XHRcdHNjYWxlWTtcblxuXHRcdFx0aWYgKHNlbGYuaXNBbmltYXRpbmcgfHwgc2VsZi5pc01vdmVkKCkgfHwgISRjb250ZW50IHx8ICEoY3VycmVudC50eXBlID09IFwiaW1hZ2VcIiAmJiBjdXJyZW50LmlzTG9hZGVkICYmICFjdXJyZW50Lmhhc0Vycm9yKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSB0cnVlO1xuXG5cdFx0XHQkLmZhbmN5Ym94LnN0b3AoJGNvbnRlbnQpO1xuXG5cdFx0XHR4ID0geCA9PT0gdW5kZWZpbmVkID8gY2FudmFzV2lkdGggKiAwLjUgOiB4O1xuXHRcdFx0eSA9IHkgPT09IHVuZGVmaW5lZCA/IGNhbnZhc0hlaWdodCAqIDAuNSA6IHk7XG5cblx0XHRcdGltZ1BvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKCRjb250ZW50KTtcblxuXHRcdFx0aW1nUG9zLnRvcCAtPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShjdXJyZW50LiRzbGlkZSkudG9wO1xuXHRcdFx0aW1nUG9zLmxlZnQgLT0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoY3VycmVudC4kc2xpZGUpLmxlZnQ7XG5cblx0XHRcdHNjYWxlWCA9IG5ld0ltZ1dpZHRoIC8gaW1nUG9zLndpZHRoO1xuXHRcdFx0c2NhbGVZID0gbmV3SW1nSGVpZ2h0IC8gaW1nUG9zLmhlaWdodDtcblxuXHRcdFx0Ly8gR2V0IGNlbnRlciBwb3NpdGlvbiBmb3Igb3JpZ2luYWwgaW1hZ2Vcblx0XHRcdHBvc1ggPSBjYW52YXNXaWR0aCAqIDAuNSAtIG5ld0ltZ1dpZHRoICogMC41O1xuXHRcdFx0cG9zWSA9IGNhbnZhc0hlaWdodCAqIDAuNSAtIG5ld0ltZ0hlaWdodCAqIDAuNTtcblxuXHRcdFx0Ly8gTWFrZSBzdXJlIGltYWdlIGRvZXMgbm90IG1vdmUgYXdheSBmcm9tIGVkZ2VzXG5cdFx0XHRpZiAobmV3SW1nV2lkdGggPiBjYW52YXNXaWR0aCkge1xuXHRcdFx0XHRwb3NYID0gaW1nUG9zLmxlZnQgKiBzY2FsZVggLSAoeCAqIHNjYWxlWCAtIHgpO1xuXG5cdFx0XHRcdGlmIChwb3NYID4gMCkge1xuXHRcdFx0XHRcdHBvc1ggPSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHBvc1ggPCBjYW52YXNXaWR0aCAtIG5ld0ltZ1dpZHRoKSB7XG5cdFx0XHRcdFx0cG9zWCA9IGNhbnZhc1dpZHRoIC0gbmV3SW1nV2lkdGg7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKG5ld0ltZ0hlaWdodCA+IGNhbnZhc0hlaWdodCkge1xuXHRcdFx0XHRwb3NZID0gaW1nUG9zLnRvcCAqIHNjYWxlWSAtICh5ICogc2NhbGVZIC0geSk7XG5cblx0XHRcdFx0aWYgKHBvc1kgPiAwKSB7XG5cdFx0XHRcdFx0cG9zWSA9IDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAocG9zWSA8IGNhbnZhc0hlaWdodCAtIG5ld0ltZ0hlaWdodCkge1xuXHRcdFx0XHRcdHBvc1kgPSBjYW52YXNIZWlnaHQgLSBuZXdJbWdIZWlnaHQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2VsZi51cGRhdGVDdXJzb3IobmV3SW1nV2lkdGgsIG5ld0ltZ0hlaWdodCk7XG5cblx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0JGNvbnRlbnQsXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0b3A6IHBvc1ksXG5cdFx0XHRcdFx0bGVmdDogcG9zWCxcblx0XHRcdFx0XHRzY2FsZVg6IHNjYWxlWCxcblx0XHRcdFx0XHRzY2FsZVk6IHNjYWxlWVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRkdXJhdGlvbiB8fCAzMzAsXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblxuXHRcdFx0Ly8gU3RvcCBzbGlkZXNob3dcblx0XHRcdGlmIChzZWxmLlNsaWRlU2hvdyAmJiBzZWxmLlNsaWRlU2hvdy5pc0FjdGl2ZSkge1xuXHRcdFx0XHRzZWxmLlNsaWRlU2hvdy5zdG9wKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIFNjYWxlIGltYWdlIHRvIGZpdCBpbnNpZGUgcGFyZW50IGVsZW1lbnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRzY2FsZVRvRml0OiBmdW5jdGlvbihkdXJhdGlvbikge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5jdXJyZW50LFxuXHRcdFx0XHQkY29udGVudCA9IGN1cnJlbnQuJGNvbnRlbnQsXG5cdFx0XHRcdGVuZDtcblxuXHRcdFx0aWYgKHNlbGYuaXNBbmltYXRpbmcgfHwgc2VsZi5pc01vdmVkKCkgfHwgISRjb250ZW50IHx8ICEoY3VycmVudC50eXBlID09IFwiaW1hZ2VcIiAmJiBjdXJyZW50LmlzTG9hZGVkICYmICFjdXJyZW50Lmhhc0Vycm9yKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSB0cnVlO1xuXG5cdFx0XHQkLmZhbmN5Ym94LnN0b3AoJGNvbnRlbnQpO1xuXG5cdFx0XHRlbmQgPSBzZWxmLmdldEZpdFBvcyhjdXJyZW50KTtcblxuXHRcdFx0c2VsZi51cGRhdGVDdXJzb3IoZW5kLndpZHRoLCBlbmQuaGVpZ2h0KTtcblxuXHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKFxuXHRcdFx0XHQkY29udGVudCxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRvcDogZW5kLnRvcCxcblx0XHRcdFx0XHRsZWZ0OiBlbmQubGVmdCxcblx0XHRcdFx0XHRzY2FsZVg6IGVuZC53aWR0aCAvICRjb250ZW50LndpZHRoKCksXG5cdFx0XHRcdFx0c2NhbGVZOiBlbmQuaGVpZ2h0IC8gJGNvbnRlbnQuaGVpZ2h0KClcblx0XHRcdFx0fSxcblx0XHRcdFx0ZHVyYXRpb24gfHwgMzMwLFxuXHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdCk7XG5cdFx0fSxcblxuXHRcdC8vIENhbGN1bGF0ZSBpbWFnZSBzaXplIHRvIGZpdCBpbnNpZGUgdmlld3BvcnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRnZXRGaXRQb3M6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRjb250ZW50ID0gc2xpZGUuJGNvbnRlbnQsXG5cdFx0XHRcdCRzbGlkZSA9IHNsaWRlLiRzbGlkZSxcblx0XHRcdFx0d2lkdGggPSBzbGlkZS53aWR0aCB8fCBzbGlkZS5vcHRzLndpZHRoLFxuXHRcdFx0XHRoZWlnaHQgPSBzbGlkZS5oZWlnaHQgfHwgc2xpZGUub3B0cy5oZWlnaHQsXG5cdFx0XHRcdG1heFdpZHRoLFxuXHRcdFx0XHRtYXhIZWlnaHQsXG5cdFx0XHRcdG1pblJhdGlvLFxuXHRcdFx0XHRhc3BlY3RSYXRpbyxcblx0XHRcdFx0cmV6ID0ge307XG5cblx0XHRcdGlmICghc2xpZGUuaXNMb2FkZWQgfHwgISRjb250ZW50IHx8ICEkY29udGVudC5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRtYXhXaWR0aCA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKHNlbGYuJHJlZnMuc3RhZ2UpLndpZHRoO1xuXHRcdFx0bWF4SGVpZ2h0ID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoc2VsZi4kcmVmcy5zdGFnZSkuaGVpZ2h0O1xuXG5cdFx0XHRtYXhXaWR0aCAtPVxuXHRcdFx0XHRwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nTGVmdFwiKSkgK1xuXHRcdFx0XHRwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nUmlnaHRcIikpICtcblx0XHRcdFx0cGFyc2VGbG9hdCgkY29udGVudC5jc3MoXCJtYXJnaW5MZWZ0XCIpKSArXG5cdFx0XHRcdHBhcnNlRmxvYXQoJGNvbnRlbnQuY3NzKFwibWFyZ2luUmlnaHRcIikpO1xuXG5cdFx0XHRtYXhIZWlnaHQgLT1cblx0XHRcdFx0cGFyc2VGbG9hdCgkc2xpZGUuY3NzKFwicGFkZGluZ1RvcFwiKSkgK1xuXHRcdFx0XHRwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nQm90dG9tXCIpKSArXG5cdFx0XHRcdHBhcnNlRmxvYXQoJGNvbnRlbnQuY3NzKFwibWFyZ2luVG9wXCIpKSArXG5cdFx0XHRcdHBhcnNlRmxvYXQoJGNvbnRlbnQuY3NzKFwibWFyZ2luQm90dG9tXCIpKTtcblxuXHRcdFx0aWYgKCF3aWR0aCB8fCAhaGVpZ2h0KSB7XG5cdFx0XHRcdHdpZHRoID0gbWF4V2lkdGg7XG5cdFx0XHRcdGhlaWdodCA9IG1heEhlaWdodDtcblx0XHRcdH1cblxuXHRcdFx0bWluUmF0aW8gPSBNYXRoLm1pbigxLCBtYXhXaWR0aCAvIHdpZHRoLCBtYXhIZWlnaHQgLyBoZWlnaHQpO1xuXG5cdFx0XHR3aWR0aCA9IG1pblJhdGlvICogd2lkdGg7XG5cdFx0XHRoZWlnaHQgPSBtaW5SYXRpbyAqIGhlaWdodDtcblxuXHRcdFx0Ly8gQWRqdXN0IHdpZHRoL2hlaWdodCB0byBwcmVjaXNlbHkgZml0IGludG8gY29udGFpbmVyXG5cdFx0XHRpZiAod2lkdGggPiBtYXhXaWR0aCAtIDAuNSkge1xuXHRcdFx0XHR3aWR0aCA9IG1heFdpZHRoO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoaGVpZ2h0ID4gbWF4SGVpZ2h0IC0gMC41KSB7XG5cdFx0XHRcdGhlaWdodCA9IG1heEhlaWdodDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHNsaWRlLnR5cGUgPT09IFwiaW1hZ2VcIikge1xuXHRcdFx0XHRyZXoudG9wID0gTWF0aC5mbG9vcigobWF4SGVpZ2h0IC0gaGVpZ2h0KSAqIDAuNSkgKyBwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nVG9wXCIpKTtcblx0XHRcdFx0cmV6LmxlZnQgPSBNYXRoLmZsb29yKChtYXhXaWR0aCAtIHdpZHRoKSAqIDAuNSkgKyBwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nTGVmdFwiKSk7XG5cdFx0XHR9IGVsc2UgaWYgKHNsaWRlLmNvbnRlbnRUeXBlID09PSBcInZpZGVvXCIpIHtcblx0XHRcdFx0Ly8gRm9yY2UgYXNwZWN0IHJhdGlvIGZvciB0aGUgdmlkZW9cblx0XHRcdFx0Ly8gXCJJIHNheSB0aGUgd2hvbGUgd29ybGQgbXVzdCBsZWFybiBvZiBvdXIgcGVhY2VmdWwgd2F5c+KApiBieSBmb3JjZSFcIlxuXHRcdFx0XHRhc3BlY3RSYXRpbyA9IHNsaWRlLm9wdHMud2lkdGggJiYgc2xpZGUub3B0cy5oZWlnaHQgPyB3aWR0aCAvIGhlaWdodCA6IHNsaWRlLm9wdHMucmF0aW8gfHwgMTYgLyA5O1xuXG5cdFx0XHRcdGlmIChoZWlnaHQgPiB3aWR0aCAvIGFzcGVjdFJhdGlvKSB7XG5cdFx0XHRcdFx0aGVpZ2h0ID0gd2lkdGggLyBhc3BlY3RSYXRpbztcblx0XHRcdFx0fSBlbHNlIGlmICh3aWR0aCA+IGhlaWdodCAqIGFzcGVjdFJhdGlvKSB7XG5cdFx0XHRcdFx0d2lkdGggPSBoZWlnaHQgKiBhc3BlY3RSYXRpbztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXoud2lkdGggPSB3aWR0aDtcblx0XHRcdHJlei5oZWlnaHQgPSBoZWlnaHQ7XG5cblx0XHRcdHJldHVybiByZXo7XG5cdFx0fSxcblxuXHRcdC8vIFVwZGF0ZSBjb250ZW50IHNpemUgYW5kIHBvc2l0aW9uIGZvciBhbGwgc2xpZGVzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dXBkYXRlOiBmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdCQuZWFjaChzZWxmLnNsaWRlcywgZnVuY3Rpb24oa2V5LCBzbGlkZSkge1xuXHRcdFx0XHRzZWxmLnVwZGF0ZVNsaWRlKHNsaWRlLCBlKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHQvLyBVcGRhdGUgc2xpZGUgY29udGVudCBwb3NpdGlvbiBhbmQgc2l6ZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHR1cGRhdGVTbGlkZTogZnVuY3Rpb24oc2xpZGUsIGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JGNvbnRlbnQgPSBzbGlkZSAmJiBzbGlkZS4kY29udGVudCxcblx0XHRcdFx0d2lkdGggPSBzbGlkZS53aWR0aCB8fCBzbGlkZS5vcHRzLndpZHRoLFxuXHRcdFx0XHRoZWlnaHQgPSBzbGlkZS5oZWlnaHQgfHwgc2xpZGUub3B0cy5oZWlnaHQsXG5cdFx0XHRcdCRzbGlkZSA9IHNsaWRlLiRzbGlkZTtcblxuXHRcdFx0Ly8gRmlyc3QsIHByZXZlbnQgY2FwdGlvbiBvdmVybGFwLCBpZiBuZWVkZWRcblx0XHRcdHNlbGYuYWRqdXN0Q2FwdGlvbihzbGlkZSk7XG5cblx0XHRcdC8vIFRoZW4gcmVzaXplIGNvbnRlbnQgdG8gZml0IGluc2lkZSB0aGUgc2xpZGVcblx0XHRcdGlmICgkY29udGVudCAmJiAod2lkdGggfHwgaGVpZ2h0IHx8IHNsaWRlLmNvbnRlbnRUeXBlID09PSBcInZpZGVvXCIpICYmICFzbGlkZS5oYXNFcnJvcikge1xuXHRcdFx0XHQkLmZhbmN5Ym94LnN0b3AoJGNvbnRlbnQpO1xuXG5cdFx0XHRcdCQuZmFuY3lib3guc2V0VHJhbnNsYXRlKCRjb250ZW50LCBzZWxmLmdldEZpdFBvcyhzbGlkZSkpO1xuXG5cdFx0XHRcdGlmIChzbGlkZS5wb3MgPT09IHNlbGYuY3VyclBvcykge1xuXHRcdFx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSBmYWxzZTtcblxuXHRcdFx0XHRcdHNlbGYudXBkYXRlQ3Vyc29yKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gVGhlbiBzb21lIGFkanVzdG1lbnRzXG5cdFx0XHRzZWxmLmFkanVzdExheW91dChzbGlkZSk7XG5cblx0XHRcdGlmICgkc2xpZGUubGVuZ3RoKSB7XG5cdFx0XHRcdCRzbGlkZS50cmlnZ2VyKFwicmVmcmVzaFwiKTtcblxuXHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBzZWxmLmN1cnJQb3MpIHtcblx0XHRcdFx0XHRzZWxmLiRyZWZzLnRvb2xiYXJcblx0XHRcdFx0XHRcdC5hZGQoc2VsZi4kcmVmcy5uYXZpZ2F0aW9uLmZpbmQoXCIuZmFuY3lib3gtYnV0dG9uLS1hcnJvd19yaWdodFwiKSlcblx0XHRcdFx0XHRcdC50b2dnbGVDbGFzcyhcImNvbXBlbnNhdGUtZm9yLXNjcm9sbGJhclwiLCAkc2xpZGUuZ2V0KDApLnNjcm9sbEhlaWdodCA+ICRzbGlkZS5nZXQoMCkuY2xpZW50SGVpZ2h0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJvblVwZGF0ZVwiLCBzbGlkZSwgZSk7XG5cdFx0fSxcblxuXHRcdC8vIEhvcml6b250YWxseSBjZW50ZXIgc2xpZGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRjZW50ZXJTbGlkZTogZnVuY3Rpb24oZHVyYXRpb24pIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0JHNsaWRlID0gY3VycmVudC4kc2xpZGU7XG5cblx0XHRcdGlmIChzZWxmLmlzQ2xvc2luZyB8fCAhY3VycmVudCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzbGlkZS5zaWJsaW5ncygpLmNzcyh7XG5cdFx0XHRcdHRyYW5zZm9ybTogXCJcIixcblx0XHRcdFx0b3BhY2l0eTogXCJcIlxuXHRcdFx0fSk7XG5cblx0XHRcdCRzbGlkZVxuXHRcdFx0XHQucGFyZW50KClcblx0XHRcdFx0LmNoaWxkcmVuKClcblx0XHRcdFx0LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtc2xpZGUtLXByZXZpb3VzIGZhbmN5Ym94LXNsaWRlLS1uZXh0XCIpO1xuXG5cdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoXG5cdFx0XHRcdCRzbGlkZSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRvcDogMCxcblx0XHRcdFx0XHRsZWZ0OiAwLFxuXHRcdFx0XHRcdG9wYWNpdHk6IDFcblx0XHRcdFx0fSxcblx0XHRcdFx0ZHVyYXRpb24gPT09IHVuZGVmaW5lZCA/IDAgOiBkdXJhdGlvbixcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gQ2xlYW4gdXBcblx0XHRcdFx0XHQkc2xpZGUuY3NzKHtcblx0XHRcdFx0XHRcdHRyYW5zZm9ybTogXCJcIixcblx0XHRcdFx0XHRcdG9wYWNpdHk6IFwiXCJcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdGlmICghY3VycmVudC5pc0NvbXBsZXRlKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmNvbXBsZXRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWxzZVxuXHRcdFx0KTtcblx0XHR9LFxuXG5cdFx0Ly8gQ2hlY2sgaWYgY3VycmVudCBzbGlkZSBpcyBtb3ZlZCAoc3dpcGVkKVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGlzTW92ZWQ6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgY3VycmVudCA9IHNsaWRlIHx8IHRoaXMuY3VycmVudCxcblx0XHRcdFx0c2xpZGVQb3MsXG5cdFx0XHRcdHN0YWdlUG9zO1xuXG5cdFx0XHRpZiAoIWN1cnJlbnQpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRzdGFnZVBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKHRoaXMuJHJlZnMuc3RhZ2UpO1xuXHRcdFx0c2xpZGVQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShjdXJyZW50LiRzbGlkZSk7XG5cblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdCFjdXJyZW50LiRzbGlkZS5oYXNDbGFzcyhcImZhbmN5Ym94LWFuaW1hdGVkXCIpICYmXG5cdFx0XHRcdChNYXRoLmFicyhzbGlkZVBvcy50b3AgLSBzdGFnZVBvcy50b3ApID4gMC41IHx8IE1hdGguYWJzKHNsaWRlUG9zLmxlZnQgLSBzdGFnZVBvcy5sZWZ0KSA+IDAuNSlcblx0XHRcdCk7XG5cdFx0fSxcblxuXHRcdC8vIFVwZGF0ZSBjdXJzb3Igc3R5bGUgZGVwZW5kaW5nIGlmIGNvbnRlbnQgY2FuIGJlIHpvb21lZFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dXBkYXRlQ3Vyc29yOiBmdW5jdGlvbihuZXh0V2lkdGgsIG5leHRIZWlnaHQpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0JGNvbnRhaW5lciA9IHNlbGYuJHJlZnMuY29udGFpbmVyLFxuXHRcdFx0XHRjYW5QYW4sXG5cdFx0XHRcdGlzWm9vbWFibGU7XG5cblx0XHRcdGlmICghY3VycmVudCB8fCBzZWxmLmlzQ2xvc2luZyB8fCAhc2VsZi5HdWVzdHVyZXMpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkY29udGFpbmVyLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtem9vbWFibGUgZmFuY3lib3gtY2FuLXpvb21JbiBmYW5jeWJveC1jYW4tem9vbU91dCBmYW5jeWJveC1jYW4tc3dpcGUgZmFuY3lib3gtY2FuLXBhblwiKTtcblxuXHRcdFx0Y2FuUGFuID0gc2VsZi5jYW5QYW4obmV4dFdpZHRoLCBuZXh0SGVpZ2h0KTtcblxuXHRcdFx0aXNab29tYWJsZSA9IGNhblBhbiA/IHRydWUgOiBzZWxmLmlzWm9vbWFibGUoKTtcblxuXHRcdFx0JGNvbnRhaW5lci50b2dnbGVDbGFzcyhcImZhbmN5Ym94LWlzLXpvb21hYmxlXCIsIGlzWm9vbWFibGUpO1xuXG5cdFx0XHQkKFwiW2RhdGEtZmFuY3lib3gtem9vbV1cIikucHJvcChcImRpc2FibGVkXCIsICFpc1pvb21hYmxlKTtcblxuXHRcdFx0aWYgKGNhblBhbikge1xuXHRcdFx0XHQkY29udGFpbmVyLmFkZENsYXNzKFwiZmFuY3lib3gtY2FuLXBhblwiKTtcblx0XHRcdH0gZWxzZSBpZiAoXG5cdFx0XHRcdGlzWm9vbWFibGUgJiZcblx0XHRcdFx0KGN1cnJlbnQub3B0cy5jbGlja0NvbnRlbnQgPT09IFwiem9vbVwiIHx8ICgkLmlzRnVuY3Rpb24oY3VycmVudC5vcHRzLmNsaWNrQ29udGVudCkgJiYgY3VycmVudC5vcHRzLmNsaWNrQ29udGVudChjdXJyZW50KSA9PSBcInpvb21cIikpXG5cdFx0XHQpIHtcblx0XHRcdFx0JGNvbnRhaW5lci5hZGRDbGFzcyhcImZhbmN5Ym94LWNhbi16b29tSW5cIik7XG5cdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnQub3B0cy50b3VjaCAmJiAoY3VycmVudC5vcHRzLnRvdWNoLnZlcnRpY2FsIHx8IHNlbGYuZ3JvdXAubGVuZ3RoID4gMSkgJiYgY3VycmVudC5jb250ZW50VHlwZSAhPT0gXCJ2aWRlb1wiKSB7XG5cdFx0XHRcdCRjb250YWluZXIuYWRkQ2xhc3MoXCJmYW5jeWJveC1jYW4tc3dpcGVcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIENoZWNrIGlmIGN1cnJlbnQgc2xpZGUgaXMgem9vbWFibGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRpc1pvb21hYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0Zml0UG9zO1xuXG5cdFx0XHQvLyBBc3N1bWUgdGhhdCBzbGlkZSBpcyB6b29tYWJsZSBpZjpcblx0XHRcdC8vICAgLSBpbWFnZSBpcyBzdGlsbCBsb2FkaW5nXG5cdFx0XHQvLyAgIC0gYWN0dWFsIHNpemUgb2YgdGhlIGltYWdlIGlzIHNtYWxsZXIgdGhhbiBhdmFpbGFibGUgYXJlYVxuXHRcdFx0aWYgKGN1cnJlbnQgJiYgIXNlbGYuaXNDbG9zaW5nICYmIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiICYmICFjdXJyZW50Lmhhc0Vycm9yKSB7XG5cdFx0XHRcdGlmICghY3VycmVudC5pc0xvYWRlZCkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zml0UG9zID0gc2VsZi5nZXRGaXRQb3MoY3VycmVudCk7XG5cblx0XHRcdFx0aWYgKGZpdFBvcyAmJiAoY3VycmVudC53aWR0aCA+IGZpdFBvcy53aWR0aCB8fCBjdXJyZW50LmhlaWdodCA+IGZpdFBvcy5oZWlnaHQpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0sXG5cblx0XHQvLyBDaGVjayBpZiBjdXJyZW50IGltYWdlIGRpbWVuc2lvbnMgYXJlIHNtYWxsZXIgdGhhbiBhY3R1YWxcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGlzU2NhbGVkRG93bjogZnVuY3Rpb24obmV4dFdpZHRoLCBuZXh0SGVpZ2h0KSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHJleiA9IGZhbHNlLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5jdXJyZW50LFxuXHRcdFx0XHQkY29udGVudCA9IGN1cnJlbnQuJGNvbnRlbnQ7XG5cblx0XHRcdGlmIChuZXh0V2lkdGggIT09IHVuZGVmaW5lZCAmJiBuZXh0SGVpZ2h0ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cmV6ID0gbmV4dFdpZHRoIDwgY3VycmVudC53aWR0aCAmJiBuZXh0SGVpZ2h0IDwgY3VycmVudC5oZWlnaHQ7XG5cdFx0XHR9IGVsc2UgaWYgKCRjb250ZW50KSB7XG5cdFx0XHRcdHJleiA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKCRjb250ZW50KTtcblx0XHRcdFx0cmV6ID0gcmV6LndpZHRoIDwgY3VycmVudC53aWR0aCAmJiByZXouaGVpZ2h0IDwgY3VycmVudC5oZWlnaHQ7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXo7XG5cdFx0fSxcblxuXHRcdC8vIENoZWNrIGlmIGltYWdlIGRpbWVuc2lvbnMgZXhjZWVkIHBhcmVudCBlbGVtZW50XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGNhblBhbjogZnVuY3Rpb24obmV4dFdpZHRoLCBuZXh0SGVpZ2h0KSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmN1cnJlbnQsXG5cdFx0XHRcdHBvcyA9IG51bGwsXG5cdFx0XHRcdHJleiA9IGZhbHNlO1xuXG5cdFx0XHRpZiAoY3VycmVudC50eXBlID09PSBcImltYWdlXCIgJiYgKGN1cnJlbnQuaXNDb21wbGV0ZSB8fCAobmV4dFdpZHRoICYmIG5leHRIZWlnaHQpKSAmJiAhY3VycmVudC5oYXNFcnJvcikge1xuXHRcdFx0XHRyZXogPSBzZWxmLmdldEZpdFBvcyhjdXJyZW50KTtcblxuXHRcdFx0XHRpZiAobmV4dFdpZHRoICE9PSB1bmRlZmluZWQgJiYgbmV4dEhlaWdodCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0cG9zID0ge3dpZHRoOiBuZXh0V2lkdGgsIGhlaWdodDogbmV4dEhlaWdodH07XG5cdFx0XHRcdH0gZWxzZSBpZiAoY3VycmVudC5pc0NvbXBsZXRlKSB7XG5cdFx0XHRcdFx0cG9zID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoY3VycmVudC4kY29udGVudCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAocG9zICYmIHJleikge1xuXHRcdFx0XHRcdHJleiA9IE1hdGguYWJzKHBvcy53aWR0aCAtIHJlei53aWR0aCkgPiAxLjUgfHwgTWF0aC5hYnMocG9zLmhlaWdodCAtIHJlei5oZWlnaHQpID4gMS41O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXo7XG5cdFx0fSxcblxuXHRcdC8vIExvYWQgY29udGVudCBpbnRvIHRoZSBzbGlkZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0bG9hZFNsaWRlOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHR0eXBlLFxuXHRcdFx0XHQkc2xpZGUsXG5cdFx0XHRcdGFqYXhMb2FkO1xuXG5cdFx0XHRpZiAoc2xpZGUuaXNMb2FkaW5nIHx8IHNsaWRlLmlzTG9hZGVkKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c2xpZGUuaXNMb2FkaW5nID0gdHJ1ZTtcblxuXHRcdFx0aWYgKHNlbGYudHJpZ2dlcihcImJlZm9yZUxvYWRcIiwgc2xpZGUpID09PSBmYWxzZSkge1xuXHRcdFx0XHRzbGlkZS5pc0xvYWRpbmcgPSBmYWxzZTtcblxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdHR5cGUgPSBzbGlkZS50eXBlO1xuXHRcdFx0JHNsaWRlID0gc2xpZGUuJHNsaWRlO1xuXG5cdFx0XHQkc2xpZGVcblx0XHRcdFx0Lm9mZihcInJlZnJlc2hcIilcblx0XHRcdFx0LnRyaWdnZXIoXCJvblJlc2V0XCIpXG5cdFx0XHRcdC5hZGRDbGFzcyhzbGlkZS5vcHRzLnNsaWRlQ2xhc3MpO1xuXG5cdFx0XHQvLyBDcmVhdGUgY29udGVudCBkZXBlbmRpbmcgb24gdGhlIHR5cGVcblx0XHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0XHRjYXNlIFwiaW1hZ2VcIjpcblx0XHRcdFx0XHRzZWxmLnNldEltYWdlKHNsaWRlKTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2UgXCJpZnJhbWVcIjpcblx0XHRcdFx0XHRzZWxmLnNldElmcmFtZShzbGlkZSk7XG5cblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlIFwiaHRtbFwiOlxuXHRcdFx0XHRcdHNlbGYuc2V0Q29udGVudChzbGlkZSwgc2xpZGUuc3JjIHx8IHNsaWRlLmNvbnRlbnQpO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcInZpZGVvXCI6XG5cdFx0XHRcdFx0c2VsZi5zZXRDb250ZW50KFxuXHRcdFx0XHRcdFx0c2xpZGUsXG5cdFx0XHRcdFx0XHRzbGlkZS5vcHRzLnZpZGVvLnRwbFxuXHRcdFx0XHRcdFx0XHQucmVwbGFjZSgvXFx7XFx7c3JjXFx9XFx9L2dpLCBzbGlkZS5zcmMpXG5cdFx0XHRcdFx0XHRcdC5yZXBsYWNlKFwie3tmb3JtYXR9fVwiLCBzbGlkZS5vcHRzLnZpZGVvRm9ybWF0IHx8IHNsaWRlLm9wdHMudmlkZW8uZm9ybWF0IHx8IFwiXCIpXG5cdFx0XHRcdFx0XHRcdC5yZXBsYWNlKFwie3twb3N0ZXJ9fVwiLCBzbGlkZS50aHVtYiB8fCBcIlwiKVxuXHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlIFwiaW5saW5lXCI6XG5cdFx0XHRcdFx0aWYgKCQoc2xpZGUuc3JjKS5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdHNlbGYuc2V0Q29udGVudChzbGlkZSwgJChzbGlkZS5zcmMpKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c2VsZi5zZXRFcnJvcihzbGlkZSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcImFqYXhcIjpcblx0XHRcdFx0XHRzZWxmLnNob3dMb2FkaW5nKHNsaWRlKTtcblxuXHRcdFx0XHRcdGFqYXhMb2FkID0gJC5hamF4KFxuXHRcdFx0XHRcdFx0JC5leHRlbmQoe30sIHNsaWRlLm9wdHMuYWpheC5zZXR0aW5ncywge1xuXHRcdFx0XHRcdFx0XHR1cmw6IHNsaWRlLnNyYyxcblx0XHRcdFx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oZGF0YSwgdGV4dFN0YXR1cykge1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0ZXh0U3RhdHVzID09PSBcInN1Y2Nlc3NcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5zZXRDb250ZW50KHNsaWRlLCBkYXRhKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGVycm9yOiBmdW5jdGlvbihqcVhIUiwgdGV4dFN0YXR1cykge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChqcVhIUiAmJiB0ZXh0U3RhdHVzICE9PSBcImFib3J0XCIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuc2V0RXJyb3Ioc2xpZGUpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0JHNsaWRlLm9uZShcIm9uUmVzZXRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRhamF4TG9hZC5hYm9ydCgpO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRzZWxmLnNldEVycm9yKHNsaWRlKTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0Ly8gVXNlIHRodW1ibmFpbCBpbWFnZSwgaWYgcG9zc2libGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2V0SW1hZ2U6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGdob3N0O1xuXG5cdFx0XHQvLyBDaGVjayBpZiBuZWVkIHRvIHNob3cgbG9hZGluZyBpY29uXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgJGltZyA9IHNsaWRlLiRpbWFnZTtcblxuXHRcdFx0XHRpZiAoIXNlbGYuaXNDbG9zaW5nICYmIHNsaWRlLmlzTG9hZGluZyAmJiAoISRpbWcgfHwgISRpbWcubGVuZ3RoIHx8ICEkaW1nWzBdLmNvbXBsZXRlKSAmJiAhc2xpZGUuaGFzRXJyb3IpIHtcblx0XHRcdFx0XHRzZWxmLnNob3dMb2FkaW5nKHNsaWRlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgNTApO1xuXG5cdFx0XHQvL0NoZWNrIGlmIGltYWdlIGhhcyBzcmNzZXRcblx0XHRcdHNlbGYuY2hlY2tTcmNzZXQoc2xpZGUpO1xuXG5cdFx0XHQvLyBUaGlzIHdpbGwgYmUgd3JhcHBlciBjb250YWluaW5nIGJvdGggZ2hvc3QgYW5kIGFjdHVhbCBpbWFnZVxuXHRcdFx0c2xpZGUuJGNvbnRlbnQgPSAkKCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtY29udGVudFwiPjwvZGl2PicpXG5cdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LWlzLWhpZGRlblwiKVxuXHRcdFx0XHQuYXBwZW5kVG8oc2xpZGUuJHNsaWRlLmFkZENsYXNzKFwiZmFuY3lib3gtc2xpZGUtLWltYWdlXCIpKTtcblxuXHRcdFx0Ly8gSWYgd2UgaGF2ZSBhIHRodW1ibmFpbCwgd2UgY2FuIGRpc3BsYXkgaXQgd2hpbGUgYWN0dWFsIGltYWdlIGlzIGxvYWRpbmdcblx0XHRcdC8vIFVzZXJzIHdpbGwgbm90IHN0YXJlIGF0IGJsYWNrIHNjcmVlbiBhbmQgYWN0dWFsIGltYWdlIHdpbGwgYXBwZWFyIGdyYWR1YWxseVxuXHRcdFx0aWYgKHNsaWRlLm9wdHMucHJlbG9hZCAhPT0gZmFsc2UgJiYgc2xpZGUub3B0cy53aWR0aCAmJiBzbGlkZS5vcHRzLmhlaWdodCAmJiBzbGlkZS50aHVtYikge1xuXHRcdFx0XHRzbGlkZS53aWR0aCA9IHNsaWRlLm9wdHMud2lkdGg7XG5cdFx0XHRcdHNsaWRlLmhlaWdodCA9IHNsaWRlLm9wdHMuaGVpZ2h0O1xuXG5cdFx0XHRcdGdob3N0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcblxuXHRcdFx0XHRnaG9zdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmUoKTtcblxuXHRcdFx0XHRcdHNsaWRlLiRnaG9zdCA9IG51bGw7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Z2hvc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi5hZnRlckxvYWQoc2xpZGUpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNsaWRlLiRnaG9zdCA9ICQoZ2hvc3QpXG5cdFx0XHRcdFx0LmFkZENsYXNzKFwiZmFuY3lib3gtaW1hZ2VcIilcblx0XHRcdFx0XHQuYXBwZW5kVG8oc2xpZGUuJGNvbnRlbnQpXG5cdFx0XHRcdFx0LmF0dHIoXCJzcmNcIiwgc2xpZGUudGh1bWIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTdGFydCBsb2FkaW5nIGFjdHVhbCBpbWFnZVxuXHRcdFx0c2VsZi5zZXRCaWdJbWFnZShzbGlkZSk7XG5cdFx0fSxcblxuXHRcdC8vIENoZWNrIGlmIGltYWdlIGhhcyBzcmNzZXQgYW5kIGdldCB0aGUgc291cmNlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0XHRjaGVja1NyY3NldDogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzcmNzZXQgPSBzbGlkZS5vcHRzLnNyY3NldCB8fCBzbGlkZS5vcHRzLmltYWdlLnNyY3NldCxcblx0XHRcdFx0Zm91bmQsXG5cdFx0XHRcdHRlbXAsXG5cdFx0XHRcdHB4UmF0aW8sXG5cdFx0XHRcdHdpbmRvd1dpZHRoO1xuXG5cdFx0XHQvLyBJZiB3ZSBoYXZlIFwic3Jjc2V0XCIsIHRoZW4gd2UgbmVlZCB0byBmaW5kIGZpcnN0IG1hdGNoaW5nIFwic3JjXCIgdmFsdWUuXG5cdFx0XHQvLyBUaGlzIGlzIG5lY2Vzc2FyeSwgYmVjYXVzZSB3aGVuIHlvdSBzZXQgYW4gc3JjIGF0dHJpYnV0ZSwgdGhlIGJyb3dzZXIgd2lsbCBwcmVsb2FkIHRoZSBpbWFnZVxuXHRcdFx0Ly8gYmVmb3JlIGFueSBqYXZhc2NyaXB0IG9yIGV2ZW4gQ1NTIGlzIGFwcGxpZWQuXG5cdFx0XHRpZiAoc3Jjc2V0KSB7XG5cdFx0XHRcdHB4UmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxO1xuXHRcdFx0XHR3aW5kb3dXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoICogcHhSYXRpbztcblxuXHRcdFx0XHR0ZW1wID0gc3Jjc2V0LnNwbGl0KFwiLFwiKS5tYXAoZnVuY3Rpb24oZWwpIHtcblx0XHRcdFx0XHR2YXIgcmV0ID0ge307XG5cblx0XHRcdFx0XHRlbC50cmltKClcblx0XHRcdFx0XHRcdC5zcGxpdCgvXFxzKy8pXG5cdFx0XHRcdFx0XHQuZm9yRWFjaChmdW5jdGlvbihlbCwgaSkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdmFsdWUgPSBwYXJzZUludChlbC5zdWJzdHJpbmcoMCwgZWwubGVuZ3RoIC0gMSksIDEwKTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoaSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiAocmV0LnVybCA9IGVsKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldC52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRcdFx0XHRcdHJldC5wb3N0Zml4ID0gZWxbZWwubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly8gU29ydCBieSB2YWx1ZVxuXHRcdFx0XHR0ZW1wLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhLnZhbHVlIC0gYi52YWx1ZTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly8gT2ssIG5vdyB3ZSBoYXZlIGFuIGFycmF5IG9mIGFsbCBzcmNzZXQgdmFsdWVzXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGVtcC5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdHZhciBlbCA9IHRlbXBbal07XG5cblx0XHRcdFx0XHRpZiAoKGVsLnBvc3RmaXggPT09IFwid1wiICYmIGVsLnZhbHVlID49IHdpbmRvd1dpZHRoKSB8fCAoZWwucG9zdGZpeCA9PT0gXCJ4XCIgJiYgZWwudmFsdWUgPj0gcHhSYXRpbykpIHtcblx0XHRcdFx0XHRcdGZvdW5kID0gZWw7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBJZiBub3QgZm91bmQsIHRha2UgdGhlIGxhc3Qgb25lXG5cdFx0XHRcdGlmICghZm91bmQgJiYgdGVtcC5sZW5ndGgpIHtcblx0XHRcdFx0XHRmb3VuZCA9IHRlbXBbdGVtcC5sZW5ndGggLSAxXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChmb3VuZCkge1xuXHRcdFx0XHRcdHNsaWRlLnNyYyA9IGZvdW5kLnVybDtcblxuXHRcdFx0XHRcdC8vIElmIHdlIGhhdmUgZGVmYXVsdCB3aWR0aC9oZWlnaHQgdmFsdWVzLCB3ZSBjYW4gY2FsY3VsYXRlIGhlaWdodCBmb3IgbWF0Y2hpbmcgc291cmNlXG5cdFx0XHRcdFx0aWYgKHNsaWRlLndpZHRoICYmIHNsaWRlLmhlaWdodCAmJiBmb3VuZC5wb3N0Zml4ID09IFwid1wiKSB7XG5cdFx0XHRcdFx0XHRzbGlkZS5oZWlnaHQgPSAoc2xpZGUud2lkdGggLyBzbGlkZS5oZWlnaHQpICogZm91bmQudmFsdWU7XG5cdFx0XHRcdFx0XHRzbGlkZS53aWR0aCA9IGZvdW5kLnZhbHVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHNsaWRlLm9wdHMuc3Jjc2V0ID0gc3Jjc2V0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIENyZWF0ZSBmdWxsLXNpemUgaW1hZ2Vcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRzZXRCaWdJbWFnZTogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0aW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKSxcblx0XHRcdFx0JGltZyA9ICQoaW1nKTtcblxuXHRcdFx0c2xpZGUuJGltYWdlID0gJGltZ1xuXHRcdFx0XHQub25lKFwiZXJyb3JcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi5zZXRFcnJvcihzbGlkZSk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbmUoXCJsb2FkXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciBzaXplcztcblxuXHRcdFx0XHRcdGlmICghc2xpZGUuJGdob3N0KSB7XG5cdFx0XHRcdFx0XHRzZWxmLnJlc29sdmVJbWFnZVNsaWRlU2l6ZShzbGlkZSwgdGhpcy5uYXR1cmFsV2lkdGgsIHRoaXMubmF0dXJhbEhlaWdodCk7XG5cblx0XHRcdFx0XHRcdHNlbGYuYWZ0ZXJMb2FkKHNsaWRlKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoc2VsZi5pc0Nsb3NpbmcpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoc2xpZGUub3B0cy5zcmNzZXQpIHtcblx0XHRcdFx0XHRcdHNpemVzID0gc2xpZGUub3B0cy5zaXplcztcblxuXHRcdFx0XHRcdFx0aWYgKCFzaXplcyB8fCBzaXplcyA9PT0gXCJhdXRvXCIpIHtcblx0XHRcdFx0XHRcdFx0c2l6ZXMgPVxuXHRcdFx0XHRcdFx0XHRcdChzbGlkZS53aWR0aCAvIHNsaWRlLmhlaWdodCA+IDEgJiYgJFcud2lkdGgoKSAvICRXLmhlaWdodCgpID4gMSA/IFwiMTAwXCIgOiBNYXRoLnJvdW5kKChzbGlkZS53aWR0aCAvIHNsaWRlLmhlaWdodCkgKiAxMDApKSArXG5cdFx0XHRcdFx0XHRcdFx0XCJ2d1wiO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQkaW1nLmF0dHIoXCJzaXplc1wiLCBzaXplcykuYXR0cihcInNyY3NldFwiLCBzbGlkZS5vcHRzLnNyY3NldCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gSGlkZSB0ZW1wb3JhcnkgaW1hZ2UgYWZ0ZXIgc29tZSBkZWxheVxuXHRcdFx0XHRcdGlmIChzbGlkZS4kZ2hvc3QpIHtcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChzbGlkZS4kZ2hvc3QgJiYgIXNlbGYuaXNDbG9zaW5nKSB7XG5cdFx0XHRcdFx0XHRcdFx0c2xpZGUuJGdob3N0LmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSwgTWF0aC5taW4oMzAwLCBNYXRoLm1heCgxMDAwLCBzbGlkZS5oZWlnaHQgLyAxNjAwKSkpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHNlbGYuaGlkZUxvYWRpbmcoc2xpZGUpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYWRkQ2xhc3MoXCJmYW5jeWJveC1pbWFnZVwiKVxuXHRcdFx0XHQuYXR0cihcInNyY1wiLCBzbGlkZS5zcmMpXG5cdFx0XHRcdC5hcHBlbmRUbyhzbGlkZS4kY29udGVudCk7XG5cblx0XHRcdGlmICgoaW1nLmNvbXBsZXRlIHx8IGltZy5yZWFkeVN0YXRlID09IFwiY29tcGxldGVcIikgJiYgJGltZy5uYXR1cmFsV2lkdGggJiYgJGltZy5uYXR1cmFsSGVpZ2h0KSB7XG5cdFx0XHRcdCRpbWcudHJpZ2dlcihcImxvYWRcIik7XG5cdFx0XHR9IGVsc2UgaWYgKGltZy5lcnJvcikge1xuXHRcdFx0XHQkaW1nLnRyaWdnZXIoXCJlcnJvclwiKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gQ29tcHV0ZXMgdGhlIHNsaWRlIHNpemUgZnJvbSBpbWFnZSBzaXplIGFuZCBtYXhXaWR0aC9tYXhIZWlnaHRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0cmVzb2x2ZUltYWdlU2xpZGVTaXplOiBmdW5jdGlvbihzbGlkZSwgaW1nV2lkdGgsIGltZ0hlaWdodCkge1xuXHRcdFx0dmFyIG1heFdpZHRoID0gcGFyc2VJbnQoc2xpZGUub3B0cy53aWR0aCwgMTApLFxuXHRcdFx0XHRtYXhIZWlnaHQgPSBwYXJzZUludChzbGlkZS5vcHRzLmhlaWdodCwgMTApO1xuXG5cdFx0XHQvLyBTZXRzIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBpbWFnZVxuXHRcdFx0c2xpZGUud2lkdGggPSBpbWdXaWR0aDtcblx0XHRcdHNsaWRlLmhlaWdodCA9IGltZ0hlaWdodDtcblxuXHRcdFx0aWYgKG1heFdpZHRoID4gMCkge1xuXHRcdFx0XHRzbGlkZS53aWR0aCA9IG1heFdpZHRoO1xuXHRcdFx0XHRzbGlkZS5oZWlnaHQgPSBNYXRoLmZsb29yKChtYXhXaWR0aCAqIGltZ0hlaWdodCkgLyBpbWdXaWR0aCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChtYXhIZWlnaHQgPiAwKSB7XG5cdFx0XHRcdHNsaWRlLndpZHRoID0gTWF0aC5mbG9vcigobWF4SGVpZ2h0ICogaW1nV2lkdGgpIC8gaW1nSGVpZ2h0KTtcblx0XHRcdFx0c2xpZGUuaGVpZ2h0ID0gbWF4SGVpZ2h0O1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBDcmVhdGUgaWZyYW1lIHdyYXBwZXIsIGlmcmFtZSBhbmQgYmluZGluZ3Ncblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHNldElmcmFtZTogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0b3B0cyA9IHNsaWRlLm9wdHMuaWZyYW1lLFxuXHRcdFx0XHQkc2xpZGUgPSBzbGlkZS4kc2xpZGUsXG5cdFx0XHRcdCRpZnJhbWU7XG5cblx0XHRcdC8vIEZpeCByZXNwb25zaXZlIGlmcmFtZXMgb24gaU9TIChhbG9uZyB3aXRoIGBwb3NpdGlvbjphYnNvbHV0ZTtgIGZvciBpZnJhbWUgZWxlbWVudClcblx0XHRcdGlmICgkLmZhbmN5Ym94LmlzTW9iaWxlKSB7XG5cdFx0XHRcdG9wdHMuY3NzLm92ZXJmbG93ID0gXCJzY3JvbGxcIjtcblx0XHRcdH1cblxuXHRcdFx0c2xpZGUuJGNvbnRlbnQgPSAkKCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtY29udGVudCcgKyAob3B0cy5wcmVsb2FkID8gXCIgZmFuY3lib3gtaXMtaGlkZGVuXCIgOiBcIlwiKSArICdcIj48L2Rpdj4nKVxuXHRcdFx0XHQuY3NzKG9wdHMuY3NzKVxuXHRcdFx0XHQuYXBwZW5kVG8oJHNsaWRlKTtcblxuXHRcdFx0JHNsaWRlLmFkZENsYXNzKFwiZmFuY3lib3gtc2xpZGUtLVwiICsgc2xpZGUuY29udGVudFR5cGUpO1xuXG5cdFx0XHRzbGlkZS4kaWZyYW1lID0gJGlmcmFtZSA9ICQob3B0cy50cGwucmVwbGFjZSgvXFx7cm5kXFx9L2csIG5ldyBEYXRlKCkuZ2V0VGltZSgpKSlcblx0XHRcdFx0LmF0dHIob3B0cy5hdHRyKVxuXHRcdFx0XHQuYXBwZW5kVG8oc2xpZGUuJGNvbnRlbnQpO1xuXG5cdFx0XHRpZiAob3B0cy5wcmVsb2FkKSB7XG5cdFx0XHRcdHNlbGYuc2hvd0xvYWRpbmcoc2xpZGUpO1xuXG5cdFx0XHRcdC8vIFVuZm9ydHVuYXRlbHksIGl0IGlzIG5vdCBhbHdheXMgcG9zc2libGUgdG8gZGV0ZXJtaW5lIGlmIGlmcmFtZSBpcyBzdWNjZXNzZnVsbHkgbG9hZGVkXG5cdFx0XHRcdC8vIChkdWUgdG8gYnJvd3NlciBzZWN1cml0eSBwb2xpY3kpXG5cblx0XHRcdFx0JGlmcmFtZS5vbihcImxvYWQuZmIgZXJyb3IuZmJcIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHRoaXMuaXNSZWFkeSA9IDE7XG5cblx0XHRcdFx0XHRzbGlkZS4kc2xpZGUudHJpZ2dlcihcInJlZnJlc2hcIik7XG5cblx0XHRcdFx0XHRzZWxmLmFmdGVyTG9hZChzbGlkZSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdC8vIFJlY2FsY3VsYXRlIGlmcmFtZSBjb250ZW50IHNpemVcblx0XHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRcdCRzbGlkZS5vbihcInJlZnJlc2guZmJcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dmFyICRjb250ZW50ID0gc2xpZGUuJGNvbnRlbnQsXG5cdFx0XHRcdFx0XHRmcmFtZVdpZHRoID0gb3B0cy5jc3Mud2lkdGgsXG5cdFx0XHRcdFx0XHRmcmFtZUhlaWdodCA9IG9wdHMuY3NzLmhlaWdodCxcblx0XHRcdFx0XHRcdCRjb250ZW50cyxcblx0XHRcdFx0XHRcdCRib2R5O1xuXG5cdFx0XHRcdFx0aWYgKCRpZnJhbWVbMF0uaXNSZWFkeSAhPT0gMSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHQkY29udGVudHMgPSAkaWZyYW1lLmNvbnRlbnRzKCk7XG5cdFx0XHRcdFx0XHQkYm9keSA9ICRjb250ZW50cy5maW5kKFwiYm9keVwiKTtcblx0XHRcdFx0XHR9IGNhdGNoIChpZ25vcmUpIHt9XG5cblx0XHRcdFx0XHQvLyBDYWxjdWxhdGUgY29udG5ldCBkaW1lbnNpb25zIGlmIGl0IGlzIGFjY2Vzc2libGVcblx0XHRcdFx0XHRpZiAoJGJvZHkgJiYgJGJvZHkubGVuZ3RoICYmICRib2R5LmNoaWxkcmVuKCkubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQvLyBBdm9pZCBzY3JvbGxpbmcgdG8gdG9wIChpZiBtdWx0aXBsZSBpbnN0YW5jZXMpXG5cdFx0XHRcdFx0XHQkc2xpZGUuY3NzKFwib3ZlcmZsb3dcIiwgXCJ2aXNpYmxlXCIpO1xuXG5cdFx0XHRcdFx0XHQkY29udGVudC5jc3Moe1xuXHRcdFx0XHRcdFx0XHR3aWR0aDogXCIxMDAlXCIsXG5cdFx0XHRcdFx0XHRcdFwibWF4LXdpZHRoXCI6IFwiMTAwJVwiLFxuXHRcdFx0XHRcdFx0XHRoZWlnaHQ6IFwiOTk5OXB4XCJcblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRpZiAoZnJhbWVXaWR0aCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdGZyYW1lV2lkdGggPSBNYXRoLmNlaWwoTWF0aC5tYXgoJGJvZHlbMF0uY2xpZW50V2lkdGgsICRib2R5Lm91dGVyV2lkdGgodHJ1ZSkpKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0JGNvbnRlbnQuY3NzKFwid2lkdGhcIiwgZnJhbWVXaWR0aCA/IGZyYW1lV2lkdGggOiBcIlwiKS5jc3MoXCJtYXgtd2lkdGhcIiwgXCJcIik7XG5cblx0XHRcdFx0XHRcdGlmIChmcmFtZUhlaWdodCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdGZyYW1lSGVpZ2h0ID0gTWF0aC5jZWlsKE1hdGgubWF4KCRib2R5WzBdLmNsaWVudEhlaWdodCwgJGJvZHkub3V0ZXJIZWlnaHQodHJ1ZSkpKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0JGNvbnRlbnQuY3NzKFwiaGVpZ2h0XCIsIGZyYW1lSGVpZ2h0ID8gZnJhbWVIZWlnaHQgOiBcIlwiKTtcblxuXHRcdFx0XHRcdFx0JHNsaWRlLmNzcyhcIm92ZXJmbG93XCIsIFwiYXV0b1wiKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkY29udGVudC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLWhpZGRlblwiKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZWxmLmFmdGVyTG9hZChzbGlkZSk7XG5cdFx0XHR9XG5cblx0XHRcdCRpZnJhbWUuYXR0cihcInNyY1wiLCBzbGlkZS5zcmMpO1xuXG5cdFx0XHQvLyBSZW1vdmUgaWZyYW1lIGlmIGNsb3Npbmcgb3IgY2hhbmdpbmcgZ2FsbGVyeSBpdGVtXG5cdFx0XHQkc2xpZGUub25lKFwib25SZXNldFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gVGhpcyBoZWxwcyBJRSBub3QgdG8gdGhyb3cgZXJyb3JzIHdoZW4gY2xvc2luZ1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdCQodGhpcylcblx0XHRcdFx0XHRcdC5maW5kKFwiaWZyYW1lXCIpXG5cdFx0XHRcdFx0XHQuaGlkZSgpXG5cdFx0XHRcdFx0XHQudW5iaW5kKClcblx0XHRcdFx0XHRcdC5hdHRyKFwic3JjXCIsIFwiLy9hYm91dDpibGFua1wiKTtcblx0XHRcdFx0fSBjYXRjaCAoaWdub3JlKSB7fVxuXG5cdFx0XHRcdCQodGhpcylcblx0XHRcdFx0XHQub2ZmKFwicmVmcmVzaC5mYlwiKVxuXHRcdFx0XHRcdC5lbXB0eSgpO1xuXG5cdFx0XHRcdHNsaWRlLmlzTG9hZGVkID0gZmFsc2U7XG5cdFx0XHRcdHNsaWRlLmlzUmV2ZWFsZWQgPSBmYWxzZTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHQvLyBXcmFwIGFuZCBhcHBlbmQgY29udGVudCB0byB0aGUgc2xpZGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2V0Q29udGVudDogZnVuY3Rpb24oc2xpZGUsIGNvbnRlbnQpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0aWYgKHNlbGYuaXNDbG9zaW5nKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi5oaWRlTG9hZGluZyhzbGlkZSk7XG5cblx0XHRcdGlmIChzbGlkZS4kY29udGVudCkge1xuXHRcdFx0XHQkLmZhbmN5Ym94LnN0b3Aoc2xpZGUuJGNvbnRlbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRzbGlkZS4kc2xpZGUuZW1wdHkoKTtcblxuXHRcdFx0Ly8gSWYgY29udGVudCBpcyBhIGpRdWVyeSBvYmplY3QsIHRoZW4gaXQgd2lsbCBiZSBtb3ZlZCB0byB0aGUgc2xpZGUuXG5cdFx0XHQvLyBUaGUgcGxhY2Vob2xkZXIgaXMgY3JlYXRlZCBzbyB3ZSB3aWxsIGtub3cgd2hlcmUgdG8gcHV0IGl0IGJhY2suXG5cdFx0XHRpZiAoaXNRdWVyeShjb250ZW50KSAmJiBjb250ZW50LnBhcmVudCgpLmxlbmd0aCkge1xuXHRcdFx0XHQvLyBNYWtlIHN1cmUgY29udGVudCBpcyBub3QgYWxyZWFkeSBtb3ZlZCB0byBmYW5jeUJveFxuXHRcdFx0XHRpZiAoY29udGVudC5oYXNDbGFzcyhcImZhbmN5Ym94LWNvbnRlbnRcIikgfHwgY29udGVudC5wYXJlbnQoKS5oYXNDbGFzcyhcImZhbmN5Ym94LWNvbnRlbnRcIikpIHtcblx0XHRcdFx0XHRjb250ZW50LnBhcmVudHMoXCIuZmFuY3lib3gtc2xpZGVcIikudHJpZ2dlcihcIm9uUmVzZXRcIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBDcmVhdGUgdGVtcG9yYXJ5IGVsZW1lbnQgbWFya2luZyBvcmlnaW5hbCBwbGFjZSBvZiB0aGUgY29udGVudFxuXHRcdFx0XHRzbGlkZS4kcGxhY2Vob2xkZXIgPSAkKFwiPGRpdj5cIilcblx0XHRcdFx0XHQuaGlkZSgpXG5cdFx0XHRcdFx0Lmluc2VydEFmdGVyKGNvbnRlbnQpO1xuXG5cdFx0XHRcdC8vIE1ha2Ugc3VyZSBjb250ZW50IGlzIHZpc2libGVcblx0XHRcdFx0Y29udGVudC5jc3MoXCJkaXNwbGF5XCIsIFwiaW5saW5lLWJsb2NrXCIpO1xuXHRcdFx0fSBlbHNlIGlmICghc2xpZGUuaGFzRXJyb3IpIHtcblx0XHRcdFx0Ly8gSWYgY29udGVudCBpcyBqdXN0IGEgcGxhaW4gdGV4dCwgdHJ5IHRvIGNvbnZlcnQgaXQgdG8gaHRtbFxuXHRcdFx0XHRpZiAoJC50eXBlKGNvbnRlbnQpID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdFx0Y29udGVudCA9ICQoXCI8ZGl2PlwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZCgkLnRyaW0oY29udGVudCkpXG5cdFx0XHRcdFx0XHQuY29udGVudHMoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIElmIFwiZmlsdGVyXCIgb3B0aW9uIGlzIHByb3ZpZGVkLCB0aGVuIGZpbHRlciBjb250ZW50XG5cdFx0XHRcdGlmIChzbGlkZS5vcHRzLmZpbHRlcikge1xuXHRcdFx0XHRcdGNvbnRlbnQgPSAkKFwiPGRpdj5cIilcblx0XHRcdFx0XHRcdC5odG1sKGNvbnRlbnQpXG5cdFx0XHRcdFx0XHQuZmluZChzbGlkZS5vcHRzLmZpbHRlcik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2xpZGUuJHNsaWRlLm9uZShcIm9uUmVzZXRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIFBhdXNlIGFsbCBodG1sNSB2aWRlby9hdWRpb1xuXHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdFx0LmZpbmQoXCJ2aWRlbyxhdWRpb1wiKVxuXHRcdFx0XHRcdC50cmlnZ2VyKFwicGF1c2VcIik7XG5cblx0XHRcdFx0Ly8gUHV0IGNvbnRlbnQgYmFja1xuXHRcdFx0XHRpZiAoc2xpZGUuJHBsYWNlaG9sZGVyKSB7XG5cdFx0XHRcdFx0c2xpZGUuJHBsYWNlaG9sZGVyLmFmdGVyKGNvbnRlbnQucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1jb250ZW50XCIpLmhpZGUoKSkucmVtb3ZlKCk7XG5cblx0XHRcdFx0XHRzbGlkZS4kcGxhY2Vob2xkZXIgPSBudWxsO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVtb3ZlIGN1c3RvbSBjbG9zZSBidXR0b25cblx0XHRcdFx0aWYgKHNsaWRlLiRzbWFsbEJ0bikge1xuXHRcdFx0XHRcdHNsaWRlLiRzbWFsbEJ0bi5yZW1vdmUoKTtcblxuXHRcdFx0XHRcdHNsaWRlLiRzbWFsbEJ0biA9IG51bGw7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZW1vdmUgY29udGVudCBhbmQgbWFyayBzbGlkZSBhcyBub3QgbG9hZGVkXG5cdFx0XHRcdGlmICghc2xpZGUuaGFzRXJyb3IpIHtcblx0XHRcdFx0XHQkKHRoaXMpLmVtcHR5KCk7XG5cblx0XHRcdFx0XHRzbGlkZS5pc0xvYWRlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdHNsaWRlLmlzUmV2ZWFsZWQgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdCQoY29udGVudCkuYXBwZW5kVG8oc2xpZGUuJHNsaWRlKTtcblxuXHRcdFx0aWYgKCQoY29udGVudCkuaXMoXCJ2aWRlbyxhdWRpb1wiKSkge1xuXHRcdFx0XHQkKGNvbnRlbnQpLmFkZENsYXNzKFwiZmFuY3lib3gtdmlkZW9cIik7XG5cblx0XHRcdFx0JChjb250ZW50KS53cmFwKFwiPGRpdj48L2Rpdj5cIik7XG5cblx0XHRcdFx0c2xpZGUuY29udGVudFR5cGUgPSBcInZpZGVvXCI7XG5cblx0XHRcdFx0c2xpZGUub3B0cy53aWR0aCA9IHNsaWRlLm9wdHMud2lkdGggfHwgJChjb250ZW50KS5hdHRyKFwid2lkdGhcIik7XG5cdFx0XHRcdHNsaWRlLm9wdHMuaGVpZ2h0ID0gc2xpZGUub3B0cy5oZWlnaHQgfHwgJChjb250ZW50KS5hdHRyKFwiaGVpZ2h0XCIpO1xuXHRcdFx0fVxuXG5cdFx0XHRzbGlkZS4kY29udGVudCA9IHNsaWRlLiRzbGlkZVxuXHRcdFx0XHQuY2hpbGRyZW4oKVxuXHRcdFx0XHQuZmlsdGVyKFwiZGl2LGZvcm0sbWFpbix2aWRlbyxhdWRpbyxhcnRpY2xlLC5mYW5jeWJveC1jb250ZW50XCIpXG5cdFx0XHRcdC5maXJzdCgpO1xuXG5cdFx0XHRzbGlkZS4kY29udGVudC5zaWJsaW5ncygpLmhpZGUoKTtcblxuXHRcdFx0Ly8gUmUtY2hlY2sgaWYgdGhlcmUgaXMgYSB2YWxpZCBjb250ZW50XG5cdFx0XHQvLyAoaW4gc29tZSBjYXNlcywgYWpheCByZXNwb25zZSBjYW4gY29udGFpbiB2YXJpb3VzIGVsZW1lbnRzIG9yIHBsYWluIHRleHQpXG5cdFx0XHRpZiAoIXNsaWRlLiRjb250ZW50Lmxlbmd0aCkge1xuXHRcdFx0XHRzbGlkZS4kY29udGVudCA9IHNsaWRlLiRzbGlkZVxuXHRcdFx0XHRcdC53cmFwSW5uZXIoXCI8ZGl2PjwvZGl2PlwiKVxuXHRcdFx0XHRcdC5jaGlsZHJlbigpXG5cdFx0XHRcdFx0LmZpcnN0KCk7XG5cdFx0XHR9XG5cblx0XHRcdHNsaWRlLiRjb250ZW50LmFkZENsYXNzKFwiZmFuY3lib3gtY29udGVudFwiKTtcblxuXHRcdFx0c2xpZGUuJHNsaWRlLmFkZENsYXNzKFwiZmFuY3lib3gtc2xpZGUtLVwiICsgc2xpZGUuY29udGVudFR5cGUpO1xuXG5cdFx0XHRzZWxmLmFmdGVyTG9hZChzbGlkZSk7XG5cdFx0fSxcblxuXHRcdC8vIERpc3BsYXkgZXJyb3IgbWVzc2FnZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2V0RXJyb3I6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHRzbGlkZS5oYXNFcnJvciA9IHRydWU7XG5cblx0XHRcdHNsaWRlLiRzbGlkZVxuXHRcdFx0XHQudHJpZ2dlcihcIm9uUmVzZXRcIilcblx0XHRcdFx0LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtc2xpZGUtLVwiICsgc2xpZGUuY29udGVudFR5cGUpXG5cdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1lcnJvclwiKTtcblxuXHRcdFx0c2xpZGUuY29udGVudFR5cGUgPSBcImh0bWxcIjtcblxuXHRcdFx0dGhpcy5zZXRDb250ZW50KHNsaWRlLCB0aGlzLnRyYW5zbGF0ZShzbGlkZSwgc2xpZGUub3B0cy5lcnJvclRwbCkpO1xuXG5cdFx0XHRpZiAoc2xpZGUucG9zID09PSB0aGlzLmN1cnJQb3MpIHtcblx0XHRcdFx0dGhpcy5pc0FuaW1hdGluZyA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBTaG93IGxvYWRpbmcgaWNvbiBpbnNpZGUgdGhlIHNsaWRlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2hvd0xvYWRpbmc6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHNsaWRlID0gc2xpZGUgfHwgc2VsZi5jdXJyZW50O1xuXG5cdFx0XHRpZiAoc2xpZGUgJiYgIXNsaWRlLiRzcGlubmVyKSB7XG5cdFx0XHRcdHNsaWRlLiRzcGlubmVyID0gJChzZWxmLnRyYW5zbGF0ZShzZWxmLCBzZWxmLm9wdHMuc3Bpbm5lclRwbCkpXG5cdFx0XHRcdFx0LmFwcGVuZFRvKHNsaWRlLiRzbGlkZSlcblx0XHRcdFx0XHQuaGlkZSgpXG5cdFx0XHRcdFx0LmZhZGVJbihcImZhc3RcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIFJlbW92ZSBsb2FkaW5nIGljb24gZnJvbSB0aGUgc2xpZGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRoaWRlTG9hZGluZzogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0c2xpZGUgPSBzbGlkZSB8fCBzZWxmLmN1cnJlbnQ7XG5cblx0XHRcdGlmIChzbGlkZSAmJiBzbGlkZS4kc3Bpbm5lcikge1xuXHRcdFx0XHRzbGlkZS4kc3Bpbm5lci5zdG9wKCkucmVtb3ZlKCk7XG5cblx0XHRcdFx0ZGVsZXRlIHNsaWRlLiRzcGlubmVyO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBBZGp1c3RtZW50cyBhZnRlciBzbGlkZSBjb250ZW50IGhhcyBiZWVuIGxvYWRlZFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRhZnRlckxvYWQ6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdGlmIChzZWxmLmlzQ2xvc2luZykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHNsaWRlLmlzTG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0c2xpZGUuaXNMb2FkZWQgPSB0cnVlO1xuXG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJhZnRlckxvYWRcIiwgc2xpZGUpO1xuXG5cdFx0XHRzZWxmLmhpZGVMb2FkaW5nKHNsaWRlKTtcblxuXHRcdFx0Ly8gQWRkIHNtYWxsIGNsb3NlIGJ1dHRvblxuXHRcdFx0aWYgKHNsaWRlLm9wdHMuc21hbGxCdG4gJiYgKCFzbGlkZS4kc21hbGxCdG4gfHwgIXNsaWRlLiRzbWFsbEJ0bi5sZW5ndGgpKSB7XG5cdFx0XHRcdHNsaWRlLiRzbWFsbEJ0biA9ICQoc2VsZi50cmFuc2xhdGUoc2xpZGUsIHNsaWRlLm9wdHMuYnRuVHBsLnNtYWxsQnRuKSkuYXBwZW5kVG8oc2xpZGUuJGNvbnRlbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBEaXNhYmxlIHJpZ2h0IGNsaWNrXG5cdFx0XHRpZiAoc2xpZGUub3B0cy5wcm90ZWN0ICYmIHNsaWRlLiRjb250ZW50ICYmICFzbGlkZS5oYXNFcnJvcikge1xuXHRcdFx0XHRzbGlkZS4kY29udGVudC5vbihcImNvbnRleHRtZW51LmZiXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAoZS5idXR0b24gPT0gMikge1xuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQvLyBBZGQgZmFrZSBlbGVtZW50IG9uIHRvcCBvZiB0aGUgaW1hZ2Vcblx0XHRcdFx0Ly8gVGhpcyBtYWtlcyBhIGJpdCBoYXJkZXIgZm9yIHVzZXIgdG8gc2VsZWN0IGltYWdlXG5cdFx0XHRcdGlmIChzbGlkZS50eXBlID09PSBcImltYWdlXCIpIHtcblx0XHRcdFx0XHQkKCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtc3BhY2ViYWxsXCI+PC9kaXY+JykuYXBwZW5kVG8oc2xpZGUuJGNvbnRlbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuYWRqdXN0Q2FwdGlvbihzbGlkZSk7XG5cblx0XHRcdHNlbGYuYWRqdXN0TGF5b3V0KHNsaWRlKTtcblxuXHRcdFx0aWYgKHNsaWRlLnBvcyA9PT0gc2VsZi5jdXJyUG9zKSB7XG5cdFx0XHRcdHNlbGYudXBkYXRlQ3Vyc29yKCk7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYucmV2ZWFsQ29udGVudChzbGlkZSk7XG5cdFx0fSxcblxuXHRcdC8vIFByZXZlbnQgY2FwdGlvbiBvdmVybGFwLFxuXHRcdC8vIGZpeCBjc3MgaW5jb25zaXN0ZW5jeSBhY3Jvc3MgYnJvd3NlcnNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRhZGp1c3RDYXB0aW9uOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2xpZGUgfHwgc2VsZi5jdXJyZW50LFxuXHRcdFx0XHRjYXB0aW9uID0gY3VycmVudC5vcHRzLmNhcHRpb24sXG5cdFx0XHRcdCRjYXB0aW9uID0gc2VsZi4kcmVmcy5jYXB0aW9uLFxuXHRcdFx0XHRjYXB0aW9uSCA9IGZhbHNlO1xuXG5cdFx0XHRpZiAoY3VycmVudC5vcHRzLnByZXZlbnRDYXB0aW9uT3ZlcmxhcCAmJiBjYXB0aW9uICYmIGNhcHRpb24ubGVuZ3RoKSB7XG5cdFx0XHRcdGlmIChjdXJyZW50LnBvcyAhPT0gc2VsZi5jdXJyUG9zKSB7XG5cdFx0XHRcdFx0JGNhcHRpb24gPSAkY2FwdGlvblxuXHRcdFx0XHRcdFx0LmNsb25lKClcblx0XHRcdFx0XHRcdC5lbXB0eSgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kVG8oJGNhcHRpb24ucGFyZW50KCkpO1xuXG5cdFx0XHRcdFx0JGNhcHRpb24uaHRtbChjYXB0aW9uKTtcblxuXHRcdFx0XHRcdGNhcHRpb25IID0gJGNhcHRpb24ub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cblx0XHRcdFx0XHQkY2FwdGlvbi5lbXB0eSgpLnJlbW92ZSgpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHNlbGYuJGNhcHRpb24pIHtcblx0XHRcdFx0XHRjYXB0aW9uSCA9IHNlbGYuJGNhcHRpb24ub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjdXJyZW50LiRzbGlkZS5jc3MoXCJwYWRkaW5nLWJvdHRvbVwiLCBjYXB0aW9uSCB8fCBcIlwiKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gU2ltcGxlIGhhY2sgdG8gZml4IGluY29uc2lzdGVuY3kgYWNyb3NzIGJyb3dzZXJzLCBkZXNjcmliZWQgaGVyZSAoYWZmZWN0cyBFZGdlLCB0b28pOlxuXHRcdC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTc0ODUxOFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YWRqdXN0TGF5b3V0OiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2xpZGUgfHwgc2VsZi5jdXJyZW50LFxuXHRcdFx0XHRzY3JvbGxIZWlnaHQsXG5cdFx0XHRcdG1hcmdpbkJvdHRvbSxcblx0XHRcdFx0aW5saW5lUGFkZGluZyxcblx0XHRcdFx0YWN0dWFsUGFkZGluZztcblxuXHRcdFx0aWYgKGN1cnJlbnQuaXNMb2FkZWQgJiYgY3VycmVudC5vcHRzLmRpc2FibGVMYXlvdXRGaXggIT09IHRydWUpIHtcblx0XHRcdFx0Y3VycmVudC4kY29udGVudC5jc3MoXCJtYXJnaW4tYm90dG9tXCIsIFwiXCIpO1xuXG5cdFx0XHRcdC8vIElmIHdlIHdvdWxkIGFsd2F5cyBzZXQgbWFyZ2luLWJvdHRvbSBmb3IgdGhlIGNvbnRlbnQsXG5cdFx0XHRcdC8vIHRoZW4gaXQgd291bGQgcG90ZW50aWFsbHkgYnJlYWsgdmVydGljYWwgYWxpZ25cblx0XHRcdFx0aWYgKGN1cnJlbnQuJGNvbnRlbnQub3V0ZXJIZWlnaHQoKSA+IGN1cnJlbnQuJHNsaWRlLmhlaWdodCgpICsgMC41KSB7XG5cdFx0XHRcdFx0aW5saW5lUGFkZGluZyA9IGN1cnJlbnQuJHNsaWRlWzBdLnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl07XG5cdFx0XHRcdFx0YWN0dWFsUGFkZGluZyA9IGN1cnJlbnQuJHNsaWRlLmNzcyhcInBhZGRpbmctYm90dG9tXCIpO1xuXG5cdFx0XHRcdFx0aWYgKHBhcnNlRmxvYXQoYWN0dWFsUGFkZGluZykgPiAwKSB7XG5cdFx0XHRcdFx0XHRzY3JvbGxIZWlnaHQgPSBjdXJyZW50LiRzbGlkZVswXS5zY3JvbGxIZWlnaHQ7XG5cblx0XHRcdFx0XHRcdGN1cnJlbnQuJHNsaWRlLmNzcyhcInBhZGRpbmctYm90dG9tXCIsIDApO1xuXG5cdFx0XHRcdFx0XHRpZiAoTWF0aC5hYnMoc2Nyb2xsSGVpZ2h0IC0gY3VycmVudC4kc2xpZGVbMF0uc2Nyb2xsSGVpZ2h0KSA8IDEpIHtcblx0XHRcdFx0XHRcdFx0bWFyZ2luQm90dG9tID0gYWN0dWFsUGFkZGluZztcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Y3VycmVudC4kc2xpZGUuY3NzKFwicGFkZGluZy1ib3R0b21cIiwgaW5saW5lUGFkZGluZyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y3VycmVudC4kY29udGVudC5jc3MoXCJtYXJnaW4tYm90dG9tXCIsIG1hcmdpbkJvdHRvbSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIE1ha2UgY29udGVudCB2aXNpYmxlXG5cdFx0Ly8gVGhpcyBtZXRob2QgaXMgY2FsbGVkIHJpZ2h0IGFmdGVyIGNvbnRlbnQgaGFzIGJlZW4gbG9hZGVkIG9yXG5cdFx0Ly8gdXNlciBuYXZpZ2F0ZXMgZ2FsbGVyeSBhbmQgdHJhbnNpdGlvbiBzaG91bGQgc3RhcnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHJldmVhbENvbnRlbnQ6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRzbGlkZSA9IHNsaWRlLiRzbGlkZSxcblx0XHRcdFx0ZW5kID0gZmFsc2UsXG5cdFx0XHRcdHN0YXJ0ID0gZmFsc2UsXG5cdFx0XHRcdGlzTW92ZWQgPSBzZWxmLmlzTW92ZWQoc2xpZGUpLFxuXHRcdFx0XHRpc1JldmVhbGVkID0gc2xpZGUuaXNSZXZlYWxlZCxcblx0XHRcdFx0ZWZmZWN0LFxuXHRcdFx0XHRlZmZlY3RDbGFzc05hbWUsXG5cdFx0XHRcdGR1cmF0aW9uLFxuXHRcdFx0XHRvcGFjaXR5O1xuXG5cdFx0XHRzbGlkZS5pc1JldmVhbGVkID0gdHJ1ZTtcblxuXHRcdFx0ZWZmZWN0ID0gc2xpZGUub3B0c1tzZWxmLmZpcnN0UnVuID8gXCJhbmltYXRpb25FZmZlY3RcIiA6IFwidHJhbnNpdGlvbkVmZmVjdFwiXTtcblx0XHRcdGR1cmF0aW9uID0gc2xpZGUub3B0c1tzZWxmLmZpcnN0UnVuID8gXCJhbmltYXRpb25EdXJhdGlvblwiIDogXCJ0cmFuc2l0aW9uRHVyYXRpb25cIl07XG5cblx0XHRcdGR1cmF0aW9uID0gcGFyc2VJbnQoc2xpZGUuZm9yY2VkRHVyYXRpb24gPT09IHVuZGVmaW5lZCA/IGR1cmF0aW9uIDogc2xpZGUuZm9yY2VkRHVyYXRpb24sIDEwKTtcblxuXHRcdFx0aWYgKGlzTW92ZWQgfHwgc2xpZGUucG9zICE9PSBzZWxmLmN1cnJQb3MgfHwgIWR1cmF0aW9uKSB7XG5cdFx0XHRcdGVmZmVjdCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDaGVjayBpZiBjYW4gem9vbVxuXHRcdFx0aWYgKGVmZmVjdCA9PT0gXCJ6b29tXCIpIHtcblx0XHRcdFx0aWYgKHNsaWRlLnBvcyA9PT0gc2VsZi5jdXJyUG9zICYmIGR1cmF0aW9uICYmIHNsaWRlLnR5cGUgPT09IFwiaW1hZ2VcIiAmJiAhc2xpZGUuaGFzRXJyb3IgJiYgKHN0YXJ0ID0gc2VsZi5nZXRUaHVtYlBvcyhzbGlkZSkpKSB7XG5cdFx0XHRcdFx0ZW5kID0gc2VsZi5nZXRGaXRQb3Moc2xpZGUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGVmZmVjdCA9IFwiZmFkZVwiO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIFpvb20gYW5pbWF0aW9uXG5cdFx0XHQvLyA9PT09PT09PT09PT09PVxuXHRcdFx0aWYgKGVmZmVjdCA9PT0gXCJ6b29tXCIpIHtcblx0XHRcdFx0c2VsZi5pc0FuaW1hdGluZyA9IHRydWU7XG5cblx0XHRcdFx0ZW5kLnNjYWxlWCA9IGVuZC53aWR0aCAvIHN0YXJ0LndpZHRoO1xuXHRcdFx0XHRlbmQuc2NhbGVZID0gZW5kLmhlaWdodCAvIHN0YXJ0LmhlaWdodDtcblxuXHRcdFx0XHQvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIGFuaW1hdGUgb3BhY2l0eVxuXHRcdFx0XHRvcGFjaXR5ID0gc2xpZGUub3B0cy56b29tT3BhY2l0eTtcblxuXHRcdFx0XHRpZiAob3BhY2l0eSA9PSBcImF1dG9cIikge1xuXHRcdFx0XHRcdG9wYWNpdHkgPSBNYXRoLmFicyhzbGlkZS53aWR0aCAvIHNsaWRlLmhlaWdodCAtIHN0YXJ0LndpZHRoIC8gc3RhcnQuaGVpZ2h0KSA+IDAuMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChvcGFjaXR5KSB7XG5cdFx0XHRcdFx0c3RhcnQub3BhY2l0eSA9IDAuMTtcblx0XHRcdFx0XHRlbmQub3BhY2l0eSA9IDE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBEcmF3IGltYWdlIGF0IHN0YXJ0IHBvc2l0aW9uXG5cdFx0XHRcdCQuZmFuY3lib3guc2V0VHJhbnNsYXRlKHNsaWRlLiRjb250ZW50LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtaGlkZGVuXCIpLCBzdGFydCk7XG5cblx0XHRcdFx0Zm9yY2VSZWRyYXcoc2xpZGUuJGNvbnRlbnQpO1xuXG5cdFx0XHRcdC8vIFN0YXJ0IGFuaW1hdGlvblxuXHRcdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoc2xpZGUuJGNvbnRlbnQsIGVuZCwgZHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSBmYWxzZTtcblxuXHRcdFx0XHRcdHNlbGYuY29tcGxldGUoKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLnVwZGF0ZVNsaWRlKHNsaWRlKTtcblxuXHRcdFx0Ly8gU2ltcGx5IHNob3cgY29udGVudCBpZiBubyBlZmZlY3Rcblx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdFx0XHRpZiAoIWVmZmVjdCkge1xuXHRcdFx0XHRzbGlkZS4kY29udGVudC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLWhpZGRlblwiKTtcblxuXHRcdFx0XHRpZiAoIWlzUmV2ZWFsZWQgJiYgaXNNb3ZlZCAmJiBzbGlkZS50eXBlID09PSBcImltYWdlXCIgJiYgIXNsaWRlLmhhc0Vycm9yKSB7XG5cdFx0XHRcdFx0c2xpZGUuJGNvbnRlbnQuaGlkZSgpLmZhZGVJbihcImZhc3RcIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBzZWxmLmN1cnJQb3MpIHtcblx0XHRcdFx0XHRzZWxmLmNvbXBsZXRlKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFByZXBhcmUgZm9yIENTUyB0cmFuc2l0b25cblx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cblx0XHRcdCQuZmFuY3lib3guc3RvcCgkc2xpZGUpO1xuXG5cdFx0XHQvL2VmZmVjdENsYXNzTmFtZSA9IFwiZmFuY3lib3gtYW5pbWF0ZWQgZmFuY3lib3gtc2xpZGUtLVwiICsgKHNsaWRlLnBvcyA+PSBzZWxmLnByZXZQb3MgPyBcIm5leHRcIiA6IFwicHJldmlvdXNcIikgKyBcIiBmYW5jeWJveC1meC1cIiArIGVmZmVjdDtcblx0XHRcdGVmZmVjdENsYXNzTmFtZSA9IFwiZmFuY3lib3gtc2xpZGUtLVwiICsgKHNsaWRlLnBvcyA+PSBzZWxmLnByZXZQb3MgPyBcIm5leHRcIiA6IFwicHJldmlvdXNcIikgKyBcIiBmYW5jeWJveC1hbmltYXRlZCBmYW5jeWJveC1meC1cIiArIGVmZmVjdDtcblxuXHRcdFx0JHNsaWRlLmFkZENsYXNzKGVmZmVjdENsYXNzTmFtZSkucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tY3VycmVudFwiKTsgLy8uYWRkQ2xhc3MoZWZmZWN0Q2xhc3NOYW1lKTtcblxuXHRcdFx0c2xpZGUuJGNvbnRlbnQucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1pcy1oaWRkZW5cIik7XG5cblx0XHRcdC8vIEZvcmNlIHJlZmxvd1xuXHRcdFx0Zm9yY2VSZWRyYXcoJHNsaWRlKTtcblxuXHRcdFx0aWYgKHNsaWRlLnR5cGUgIT09IFwiaW1hZ2VcIikge1xuXHRcdFx0XHRzbGlkZS4kY29udGVudC5oaWRlKCkuc2hvdygwKTtcblx0XHRcdH1cblxuXHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKFxuXHRcdFx0XHQkc2xpZGUsXG5cdFx0XHRcdFwiZmFuY3lib3gtc2xpZGUtLWN1cnJlbnRcIixcblx0XHRcdFx0ZHVyYXRpb24sXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCRzbGlkZS5yZW1vdmVDbGFzcyhlZmZlY3RDbGFzc05hbWUpLmNzcyh7XG5cdFx0XHRcdFx0XHR0cmFuc2Zvcm06IFwiXCIsXG5cdFx0XHRcdFx0XHRvcGFjaXR5OiBcIlwiXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBzZWxmLmN1cnJQb3MpIHtcblx0XHRcdFx0XHRcdHNlbGYuY29tcGxldGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRydWVcblx0XHRcdCk7XG5cdFx0fSxcblxuXHRcdC8vIENoZWNrIGlmIHdlIGNhbiBhbmQgaGF2ZSB0byB6b29tIGZyb20gdGh1bWJuYWlsXG5cdFx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGdldFRodW1iUG9zOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHJleiA9IGZhbHNlLFxuXHRcdFx0XHQkdGh1bWIgPSBzbGlkZS4kdGh1bWIsXG5cdFx0XHRcdHRodW1iUG9zLFxuXHRcdFx0XHRidHcsXG5cdFx0XHRcdGJydyxcblx0XHRcdFx0YmJ3LFxuXHRcdFx0XHRibHc7XG5cblx0XHRcdGlmICghJHRodW1iIHx8ICFpblZpZXdwb3J0KCR0aHVtYlswXSkpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR0aHVtYlBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKCR0aHVtYik7XG5cblx0XHRcdGJ0dyA9IHBhcnNlRmxvYXQoJHRodW1iLmNzcyhcImJvcmRlci10b3Atd2lkdGhcIikgfHwgMCk7XG5cdFx0XHRicncgPSBwYXJzZUZsb2F0KCR0aHVtYi5jc3MoXCJib3JkZXItcmlnaHQtd2lkdGhcIikgfHwgMCk7XG5cdFx0XHRiYncgPSBwYXJzZUZsb2F0KCR0aHVtYi5jc3MoXCJib3JkZXItYm90dG9tLXdpZHRoXCIpIHx8IDApO1xuXHRcdFx0Ymx3ID0gcGFyc2VGbG9hdCgkdGh1bWIuY3NzKFwiYm9yZGVyLWxlZnQtd2lkdGhcIikgfHwgMCk7XG5cblx0XHRcdHJleiA9IHtcblx0XHRcdFx0dG9wOiB0aHVtYlBvcy50b3AgKyBidHcsXG5cdFx0XHRcdGxlZnQ6IHRodW1iUG9zLmxlZnQgKyBibHcsXG5cdFx0XHRcdHdpZHRoOiB0aHVtYlBvcy53aWR0aCAtIGJydyAtIGJsdyxcblx0XHRcdFx0aGVpZ2h0OiB0aHVtYlBvcy5oZWlnaHQgLSBidHcgLSBiYncsXG5cdFx0XHRcdHNjYWxlWDogMSxcblx0XHRcdFx0c2NhbGVZOiAxXG5cdFx0XHR9O1xuXG5cdFx0XHRyZXR1cm4gdGh1bWJQb3Mud2lkdGggPiAwICYmIHRodW1iUG9zLmhlaWdodCA+IDAgPyByZXogOiBmYWxzZTtcblx0XHR9LFxuXG5cdFx0Ly8gRmluYWwgYWRqdXN0bWVudHMgYWZ0ZXIgY3VycmVudCBnYWxsZXJ5IGl0ZW0gaXMgbW92ZWQgdG8gcG9zaXRpb25cblx0XHQvLyBhbmQgaXRgcyBjb250ZW50IGlzIGxvYWRlZFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5jdXJyZW50LFxuXHRcdFx0XHRzbGlkZXMgPSB7fSxcblx0XHRcdFx0JGVsO1xuXG5cdFx0XHRpZiAoc2VsZi5pc01vdmVkKCkgfHwgIWN1cnJlbnQuaXNMb2FkZWQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIWN1cnJlbnQuaXNDb21wbGV0ZSkge1xuXHRcdFx0XHRjdXJyZW50LmlzQ29tcGxldGUgPSB0cnVlO1xuXG5cdFx0XHRcdGN1cnJlbnQuJHNsaWRlLnNpYmxpbmdzKCkudHJpZ2dlcihcIm9uUmVzZXRcIik7XG5cblx0XHRcdFx0c2VsZi5wcmVsb2FkKFwiaW5saW5lXCIpO1xuXG5cdFx0XHRcdC8vIFRyaWdnZXIgYW55IENTUyB0cmFuc2l0b24gaW5zaWRlIHRoZSBzbGlkZVxuXHRcdFx0XHRmb3JjZVJlZHJhdyhjdXJyZW50LiRzbGlkZSk7XG5cblx0XHRcdFx0Y3VycmVudC4kc2xpZGUuYWRkQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tY29tcGxldGVcIik7XG5cblx0XHRcdFx0Ly8gUmVtb3ZlIHVubmVjZXNzYXJ5IHNsaWRlc1xuXHRcdFx0XHQkLmVhY2goc2VsZi5zbGlkZXMsIGZ1bmN0aW9uKGtleSwgc2xpZGUpIHtcblx0XHRcdFx0XHRpZiAoc2xpZGUucG9zID49IHNlbGYuY3VyclBvcyAtIDEgJiYgc2xpZGUucG9zIDw9IHNlbGYuY3VyclBvcyArIDEpIHtcblx0XHRcdFx0XHRcdHNsaWRlc1tzbGlkZS5wb3NdID0gc2xpZGU7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzbGlkZSkge1xuXHRcdFx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKHNsaWRlLiRzbGlkZSk7XG5cblx0XHRcdFx0XHRcdHNsaWRlLiRzbGlkZS5vZmYoKS5yZW1vdmUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNlbGYuc2xpZGVzID0gc2xpZGVzO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cblx0XHRcdHNlbGYudXBkYXRlQ3Vyc29yKCk7XG5cblx0XHRcdHNlbGYudHJpZ2dlcihcImFmdGVyU2hvd1wiKTtcblxuXHRcdFx0Ly8gQXV0b3BsYXkgZmlyc3QgaHRtbDUgdmlkZW8vYXVkaW9cblx0XHRcdGlmICghIWN1cnJlbnQub3B0cy52aWRlby5hdXRvU3RhcnQpIHtcblx0XHRcdFx0Y3VycmVudC4kc2xpZGVcblx0XHRcdFx0XHQuZmluZChcInZpZGVvLGF1ZGlvXCIpXG5cdFx0XHRcdFx0LmZpbHRlcihcIjp2aXNpYmxlOmZpcnN0XCIpXG5cdFx0XHRcdFx0LnRyaWdnZXIoXCJwbGF5XCIpXG5cdFx0XHRcdFx0Lm9uZShcImVuZGVkXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMud2Via2l0RXhpdEZ1bGxzY3JlZW4pIHtcblx0XHRcdFx0XHRcdFx0dGhpcy53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzZWxmLm5leHQoKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVHJ5IHRvIGZvY3VzIG9uIHRoZSBmaXJzdCBmb2N1c2FibGUgZWxlbWVudFxuXHRcdFx0aWYgKGN1cnJlbnQub3B0cy5hdXRvRm9jdXMgJiYgY3VycmVudC5jb250ZW50VHlwZSA9PT0gXCJodG1sXCIpIHtcblx0XHRcdFx0Ly8gTG9vayBmb3IgdGhlIGZpcnN0IGlucHV0IHdpdGggYXV0b2ZvY3VzIGF0dHJpYnV0ZVxuXHRcdFx0XHQkZWwgPSBjdXJyZW50LiRjb250ZW50LmZpbmQoXCJpbnB1dFthdXRvZm9jdXNdOmVuYWJsZWQ6dmlzaWJsZTpmaXJzdFwiKTtcblxuXHRcdFx0XHRpZiAoJGVsLmxlbmd0aCkge1xuXHRcdFx0XHRcdCRlbC50cmlnZ2VyKFwiZm9jdXNcIik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2VsZi5mb2N1cyhudWxsLCB0cnVlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBBdm9pZCBqdW1waW5nXG5cdFx0XHRjdXJyZW50LiRzbGlkZS5zY3JvbGxUb3AoMCkuc2Nyb2xsTGVmdCgwKTtcblx0XHR9LFxuXG5cdFx0Ly8gUHJlbG9hZCBuZXh0IGFuZCBwcmV2aW91cyBzbGlkZXNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0cHJlbG9hZDogZnVuY3Rpb24odHlwZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRwcmV2LFxuXHRcdFx0XHRuZXh0O1xuXG5cdFx0XHRpZiAoc2VsZi5ncm91cC5sZW5ndGggPCAyKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0bmV4dCA9IHNlbGYuc2xpZGVzW3NlbGYuY3VyclBvcyArIDFdO1xuXHRcdFx0cHJldiA9IHNlbGYuc2xpZGVzW3NlbGYuY3VyclBvcyAtIDFdO1xuXG5cdFx0XHRpZiAocHJldiAmJiBwcmV2LnR5cGUgPT09IHR5cGUpIHtcblx0XHRcdFx0c2VsZi5sb2FkU2xpZGUocHJldik7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChuZXh0ICYmIG5leHQudHlwZSA9PT0gdHlwZSkge1xuXHRcdFx0XHRzZWxmLmxvYWRTbGlkZShuZXh0KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gVHJ5IHRvIGZpbmQgYW5kIGZvY3VzIG9uIHRoZSBmaXJzdCBmb2N1c2FibGUgZWxlbWVudFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGZvY3VzOiBmdW5jdGlvbihlLCBmaXJzdFJ1bikge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRmb2N1c2FibGVTdHIgPSBbXG5cdFx0XHRcdFx0XCJhW2hyZWZdXCIsXG5cdFx0XHRcdFx0XCJhcmVhW2hyZWZdXCIsXG5cdFx0XHRcdFx0J2lucHV0Om5vdChbZGlzYWJsZWRdKTpub3QoW3R5cGU9XCJoaWRkZW5cIl0pOm5vdChbYXJpYS1oaWRkZW5dKScsXG5cdFx0XHRcdFx0XCJzZWxlY3Q6bm90KFtkaXNhYmxlZF0pOm5vdChbYXJpYS1oaWRkZW5dKVwiLFxuXHRcdFx0XHRcdFwidGV4dGFyZWE6bm90KFtkaXNhYmxlZF0pOm5vdChbYXJpYS1oaWRkZW5dKVwiLFxuXHRcdFx0XHRcdFwiYnV0dG9uOm5vdChbZGlzYWJsZWRdKTpub3QoW2FyaWEtaGlkZGVuXSlcIixcblx0XHRcdFx0XHRcImlmcmFtZVwiLFxuXHRcdFx0XHRcdFwib2JqZWN0XCIsXG5cdFx0XHRcdFx0XCJlbWJlZFwiLFxuXHRcdFx0XHRcdFwiW2NvbnRlbnRlZGl0YWJsZV1cIixcblx0XHRcdFx0XHQnW3RhYmluZGV4XTpub3QoW3RhYmluZGV4Xj1cIi1cIl0pJ1xuXHRcdFx0XHRdLmpvaW4oXCIsXCIpLFxuXHRcdFx0XHRmb2N1c2FibGVJdGVtcyxcblx0XHRcdFx0Zm9jdXNlZEl0ZW1JbmRleDtcblxuXHRcdFx0aWYgKHNlbGYuaXNDbG9zaW5nKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGUgfHwgIXNlbGYuY3VycmVudCB8fCAhc2VsZi5jdXJyZW50LmlzQ29tcGxldGUpIHtcblx0XHRcdFx0Ly8gRm9jdXMgb24gYW55IGVsZW1lbnQgaW5zaWRlIGZhbmN5Ym94XG5cdFx0XHRcdGZvY3VzYWJsZUl0ZW1zID0gc2VsZi4kcmVmcy5jb250YWluZXIuZmluZChcIio6dmlzaWJsZVwiKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEZvY3VzIGluc2lkZSBjdXJyZW50IHNsaWRlXG5cdFx0XHRcdGZvY3VzYWJsZUl0ZW1zID0gc2VsZi5jdXJyZW50LiRzbGlkZS5maW5kKFwiKjp2aXNpYmxlXCIgKyAoZmlyc3RSdW4gPyBcIjpub3QoLmZhbmN5Ym94LWNsb3NlLXNtYWxsKVwiIDogXCJcIikpO1xuXHRcdFx0fVxuXG5cdFx0XHRmb2N1c2FibGVJdGVtcyA9IGZvY3VzYWJsZUl0ZW1zLmZpbHRlcihmb2N1c2FibGVTdHIpLmZpbHRlcihmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICQodGhpcykuY3NzKFwidmlzaWJpbGl0eVwiKSAhPT0gXCJoaWRkZW5cIiAmJiAhJCh0aGlzKS5oYXNDbGFzcyhcImRpc2FibGVkXCIpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChmb2N1c2FibGVJdGVtcy5sZW5ndGgpIHtcblx0XHRcdFx0Zm9jdXNlZEl0ZW1JbmRleCA9IGZvY3VzYWJsZUl0ZW1zLmluZGV4KGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpO1xuXG5cdFx0XHRcdGlmIChlICYmIGUuc2hpZnRLZXkpIHtcblx0XHRcdFx0XHQvLyBCYWNrIHRhYlxuXHRcdFx0XHRcdGlmIChmb2N1c2VkSXRlbUluZGV4IDwgMCB8fCBmb2N1c2VkSXRlbUluZGV4ID09IDApIHtcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdFx0Zm9jdXNhYmxlSXRlbXMuZXEoZm9jdXNhYmxlSXRlbXMubGVuZ3RoIC0gMSkudHJpZ2dlcihcImZvY3VzXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBPdXRzaWRlIG9yIEZvcndhcmQgdGFiXG5cdFx0XHRcdFx0aWYgKGZvY3VzZWRJdGVtSW5kZXggPCAwIHx8IGZvY3VzZWRJdGVtSW5kZXggPT0gZm9jdXNhYmxlSXRlbXMubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRcdFx0aWYgKGUpIHtcblx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRmb2N1c2FibGVJdGVtcy5lcSgwKS50cmlnZ2VyKFwiZm9jdXNcIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lci50cmlnZ2VyKFwiZm9jdXNcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIEFjdGl2YXRlcyBjdXJyZW50IGluc3RhbmNlIC0gYnJpbmdzIGNvbnRhaW5lciB0byB0aGUgZnJvbnQgYW5kIGVuYWJsZXMga2V5Ym9hcmQsXG5cdFx0Ly8gbm90aWZpZXMgb3RoZXIgaW5zdGFuY2VzIGFib3V0IGRlYWN0aXZhdGluZ1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YWN0aXZhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHQvLyBEZWFjdGl2YXRlIGFsbCBpbnN0YW5jZXNcblx0XHRcdCQoXCIuZmFuY3lib3gtY29udGFpbmVyXCIpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBpbnN0YW5jZSA9ICQodGhpcykuZGF0YShcIkZhbmN5Qm94XCIpO1xuXG5cdFx0XHRcdC8vIFNraXAgc2VsZiBhbmQgY2xvc2luZyBpbnN0YW5jZXNcblx0XHRcdFx0aWYgKGluc3RhbmNlICYmIGluc3RhbmNlLmlkICE9PSBzZWxmLmlkICYmICFpbnN0YW5jZS5pc0Nsb3NpbmcpIHtcblx0XHRcdFx0XHRpbnN0YW5jZS50cmlnZ2VyKFwib25EZWFjdGl2YXRlXCIpO1xuXG5cdFx0XHRcdFx0aW5zdGFuY2UucmVtb3ZlRXZlbnRzKCk7XG5cblx0XHRcdFx0XHRpbnN0YW5jZS5pc1Zpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHNlbGYuaXNWaXNpYmxlID0gdHJ1ZTtcblxuXHRcdFx0aWYgKHNlbGYuY3VycmVudCB8fCBzZWxmLmlzSWRsZSkge1xuXHRcdFx0XHRzZWxmLnVwZGF0ZSgpO1xuXG5cdFx0XHRcdHNlbGYudXBkYXRlQ29udHJvbHMoKTtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi50cmlnZ2VyKFwib25BY3RpdmF0ZVwiKTtcblxuXHRcdFx0c2VsZi5hZGRFdmVudHMoKTtcblx0XHR9LFxuXG5cdFx0Ly8gU3RhcnQgY2xvc2luZyBwcm9jZWR1cmVcblx0XHQvLyBUaGlzIHdpbGwgc3RhcnQgXCJ6b29tLW91dFwiIGFuaW1hdGlvbiBpZiBuZWVkZWQgYW5kIGNsZWFuIGV2ZXJ5dGhpbmcgdXAgYWZ0ZXJ3YXJkc1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Y2xvc2U6IGZ1bmN0aW9uKGUsIGQpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0ZWZmZWN0LFxuXHRcdFx0XHRkdXJhdGlvbixcblx0XHRcdFx0JGNvbnRlbnQsXG5cdFx0XHRcdGRvbVJlY3QsXG5cdFx0XHRcdG9wYWNpdHksXG5cdFx0XHRcdHN0YXJ0LFxuXHRcdFx0XHRlbmQ7XG5cblx0XHRcdHZhciBkb25lID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuY2xlYW5VcChlKTtcblx0XHRcdH07XG5cblx0XHRcdGlmIChzZWxmLmlzQ2xvc2luZykge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuaXNDbG9zaW5nID0gdHJ1ZTtcblxuXHRcdFx0Ly8gSWYgYmVmb3JlQ2xvc2UgY2FsbGJhY2sgcHJldmVudHMgY2xvc2luZywgbWFrZSBzdXJlIGNvbnRlbnQgaXMgY2VudGVyZWRcblx0XHRcdGlmIChzZWxmLnRyaWdnZXIoXCJiZWZvcmVDbG9zZVwiLCBlKSA9PT0gZmFsc2UpIHtcblx0XHRcdFx0c2VsZi5pc0Nsb3NpbmcgPSBmYWxzZTtcblxuXHRcdFx0XHRyZXF1ZXN0QUZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYudXBkYXRlKCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVtb3ZlIGFsbCBldmVudHNcblx0XHRcdC8vIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBpbnN0YW5jZXMsIHRoZXkgd2lsbCBiZSBzZXQgYWdhaW4gYnkgXCJhY3RpdmF0ZVwiIG1ldGhvZFxuXHRcdFx0c2VsZi5yZW1vdmVFdmVudHMoKTtcblxuXHRcdFx0JGNvbnRlbnQgPSBjdXJyZW50LiRjb250ZW50O1xuXHRcdFx0ZWZmZWN0ID0gY3VycmVudC5vcHRzLmFuaW1hdGlvbkVmZmVjdDtcblx0XHRcdGR1cmF0aW9uID0gJC5pc051bWVyaWMoZCkgPyBkIDogZWZmZWN0ID8gY3VycmVudC5vcHRzLmFuaW1hdGlvbkR1cmF0aW9uIDogMDtcblxuXHRcdFx0Y3VycmVudC4kc2xpZGUucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tY29tcGxldGUgZmFuY3lib3gtc2xpZGUtLW5leHQgZmFuY3lib3gtc2xpZGUtLXByZXZpb3VzIGZhbmN5Ym94LWFuaW1hdGVkXCIpO1xuXG5cdFx0XHRpZiAoZSAhPT0gdHJ1ZSkge1xuXHRcdFx0XHQkLmZhbmN5Ym94LnN0b3AoY3VycmVudC4kc2xpZGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWZmZWN0ID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFJlbW92ZSBvdGhlciBzbGlkZXNcblx0XHRcdGN1cnJlbnQuJHNsaWRlXG5cdFx0XHRcdC5zaWJsaW5ncygpXG5cdFx0XHRcdC50cmlnZ2VyKFwib25SZXNldFwiKVxuXHRcdFx0XHQucmVtb3ZlKCk7XG5cblx0XHRcdC8vIFRyaWdnZXIgYW5pbWF0aW9uc1xuXHRcdFx0aWYgKGR1cmF0aW9uKSB7XG5cdFx0XHRcdHNlbGYuJHJlZnMuY29udGFpbmVyXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtb3BlblwiKVxuXHRcdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LWlzLWNsb3NpbmdcIilcblx0XHRcdFx0XHQuY3NzKFwidHJhbnNpdGlvbi1kdXJhdGlvblwiLCBkdXJhdGlvbiArIFwibXNcIik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIENsZWFuIHVwXG5cdFx0XHRzZWxmLmhpZGVMb2FkaW5nKGN1cnJlbnQpO1xuXG5cdFx0XHRzZWxmLmhpZGVDb250cm9scyh0cnVlKTtcblxuXHRcdFx0c2VsZi51cGRhdGVDdXJzb3IoKTtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgcG9zc2libGUgdG8gem9vbS1vdXRcblx0XHRcdGlmIChcblx0XHRcdFx0ZWZmZWN0ID09PSBcInpvb21cIiAmJlxuXHRcdFx0XHQhKCRjb250ZW50ICYmIGR1cmF0aW9uICYmIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiICYmICFzZWxmLmlzTW92ZWQoKSAmJiAhY3VycmVudC5oYXNFcnJvciAmJiAoZW5kID0gc2VsZi5nZXRUaHVtYlBvcyhjdXJyZW50KSkpXG5cdFx0XHQpIHtcblx0XHRcdFx0ZWZmZWN0ID0gXCJmYWRlXCI7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChlZmZlY3QgPT09IFwiem9vbVwiKSB7XG5cdFx0XHRcdCQuZmFuY3lib3guc3RvcCgkY29udGVudCk7XG5cblx0XHRcdFx0ZG9tUmVjdCA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKCRjb250ZW50KTtcblxuXHRcdFx0XHRzdGFydCA9IHtcblx0XHRcdFx0XHR0b3A6IGRvbVJlY3QudG9wLFxuXHRcdFx0XHRcdGxlZnQ6IGRvbVJlY3QubGVmdCxcblx0XHRcdFx0XHRzY2FsZVg6IGRvbVJlY3Qud2lkdGggLyBlbmQud2lkdGgsXG5cdFx0XHRcdFx0c2NhbGVZOiBkb21SZWN0LmhlaWdodCAvIGVuZC5oZWlnaHQsXG5cdFx0XHRcdFx0d2lkdGg6IGVuZC53aWR0aCxcblx0XHRcdFx0XHRoZWlnaHQ6IGVuZC5oZWlnaHRcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIGFuaW1hdGUgb3BhY2l0eVxuXHRcdFx0XHRvcGFjaXR5ID0gY3VycmVudC5vcHRzLnpvb21PcGFjaXR5O1xuXG5cdFx0XHRcdGlmIChvcGFjaXR5ID09IFwiYXV0b1wiKSB7XG5cdFx0XHRcdFx0b3BhY2l0eSA9IE1hdGguYWJzKGN1cnJlbnQud2lkdGggLyBjdXJyZW50LmhlaWdodCAtIGVuZC53aWR0aCAvIGVuZC5oZWlnaHQpID4gMC4xO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG9wYWNpdHkpIHtcblx0XHRcdFx0XHRlbmQub3BhY2l0eSA9IDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZSgkY29udGVudCwgc3RhcnQpO1xuXG5cdFx0XHRcdGZvcmNlUmVkcmF3KCRjb250ZW50KTtcblxuXHRcdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoJGNvbnRlbnQsIGVuZCwgZHVyYXRpb24sIGRvbmUpO1xuXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZWZmZWN0ICYmIGR1cmF0aW9uKSB7XG5cdFx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0XHRjdXJyZW50LiRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1wcmV2aW91c1wiKS5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1jdXJyZW50XCIpLFxuXHRcdFx0XHRcdFwiZmFuY3lib3gtYW5pbWF0ZWQgZmFuY3lib3gtZngtXCIgKyBlZmZlY3QsXG5cdFx0XHRcdFx0ZHVyYXRpb24sXG5cdFx0XHRcdFx0ZG9uZVxuXHRcdFx0XHQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gSWYgc2tpcCBhbmltYXRpb25cblx0XHRcdFx0aWYgKGUgPT09IHRydWUpIHtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGRvbmUsIGR1cmF0aW9uKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkb25lKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblxuXHRcdC8vIEZpbmFsIGFkanVzdG1lbnRzIGFmdGVyIHJlbW92aW5nIHRoZSBpbnN0YW5jZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Y2xlYW5VcDogZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRpbnN0YW5jZSxcblx0XHRcdFx0JGZvY3VzID0gc2VsZi5jdXJyZW50Lm9wdHMuJG9yaWcsXG5cdFx0XHRcdHgsXG5cdFx0XHRcdHk7XG5cblx0XHRcdHNlbGYuY3VycmVudC4kc2xpZGUudHJpZ2dlcihcIm9uUmVzZXRcIik7XG5cblx0XHRcdHNlbGYuJHJlZnMuY29udGFpbmVyLmVtcHR5KCkucmVtb3ZlKCk7XG5cblx0XHRcdHNlbGYudHJpZ2dlcihcImFmdGVyQ2xvc2VcIiwgZSk7XG5cblx0XHRcdC8vIFBsYWNlIGJhY2sgZm9jdXNcblx0XHRcdGlmICghIXNlbGYuY3VycmVudC5vcHRzLmJhY2tGb2N1cykge1xuXHRcdFx0XHRpZiAoISRmb2N1cyB8fCAhJGZvY3VzLmxlbmd0aCB8fCAhJGZvY3VzLmlzKFwiOnZpc2libGVcIikpIHtcblx0XHRcdFx0XHQkZm9jdXMgPSBzZWxmLiR0cmlnZ2VyO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCRmb2N1cyAmJiAkZm9jdXMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0eCA9IHdpbmRvdy5zY3JvbGxYO1xuXHRcdFx0XHRcdHkgPSB3aW5kb3cuc2Nyb2xsWTtcblxuXHRcdFx0XHRcdCRmb2N1cy50cmlnZ2VyKFwiZm9jdXNcIik7XG5cblx0XHRcdFx0XHQkKFwiaHRtbCwgYm9keVwiKVxuXHRcdFx0XHRcdFx0LnNjcm9sbFRvcCh5KVxuXHRcdFx0XHRcdFx0LnNjcm9sbExlZnQoeCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2VsZi5jdXJyZW50ID0gbnVsbDtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlcmUgYXJlIG90aGVyIGluc3RhbmNlc1xuXHRcdFx0aW5zdGFuY2UgPSAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCk7XG5cblx0XHRcdGlmIChpbnN0YW5jZSkge1xuXHRcdFx0XHRpbnN0YW5jZS5hY3RpdmF0ZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JChcImJvZHlcIikucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1hY3RpdmUgY29tcGVuc2F0ZS1mb3Itc2Nyb2xsYmFyXCIpO1xuXG5cdFx0XHRcdCQoXCIjZmFuY3lib3gtc3R5bGUtbm9zY3JvbGxcIikucmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIENhbGwgY2FsbGJhY2sgYW5kIHRyaWdnZXIgYW4gZXZlbnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHR0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBzbGlkZSkge1xuXHRcdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuXHRcdFx0XHRzZWxmID0gdGhpcyxcblx0XHRcdFx0b2JqID0gc2xpZGUgJiYgc2xpZGUub3B0cyA/IHNsaWRlIDogc2VsZi5jdXJyZW50LFxuXHRcdFx0XHRyZXo7XG5cblx0XHRcdGlmIChvYmopIHtcblx0XHRcdFx0YXJncy51bnNoaWZ0KG9iaik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRvYmogPSBzZWxmO1xuXHRcdFx0fVxuXG5cdFx0XHRhcmdzLnVuc2hpZnQoc2VsZik7XG5cblx0XHRcdGlmICgkLmlzRnVuY3Rpb24ob2JqLm9wdHNbbmFtZV0pKSB7XG5cdFx0XHRcdHJleiA9IG9iai5vcHRzW25hbWVdLmFwcGx5KG9iaiwgYXJncyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZXogPT09IGZhbHNlKSB7XG5cdFx0XHRcdHJldHVybiByZXo7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChuYW1lID09PSBcImFmdGVyQ2xvc2VcIiB8fCAhc2VsZi4kcmVmcykge1xuXHRcdFx0XHQkRC50cmlnZ2VyKG5hbWUgKyBcIi5mYlwiLCBhcmdzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYuJHJlZnMuY29udGFpbmVyLnRyaWdnZXIobmFtZSArIFwiLmZiXCIsIGFyZ3MpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBVcGRhdGUgaW5mb2JhciB2YWx1ZXMsIG5hdmlnYXRpb24gYnV0dG9uIHN0YXRlcyBhbmQgcmV2ZWFsIGNhcHRpb25cblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHVwZGF0ZUNvbnRyb2xzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0aW5kZXggPSBjdXJyZW50LmluZGV4LFxuXHRcdFx0XHQkY29udGFpbmVyID0gc2VsZi4kcmVmcy5jb250YWluZXIsXG5cdFx0XHRcdCRjYXB0aW9uID0gc2VsZi4kcmVmcy5jYXB0aW9uLFxuXHRcdFx0XHRjYXB0aW9uID0gY3VycmVudC5vcHRzLmNhcHRpb247XG5cblx0XHRcdC8vIFJlY2FsY3VsYXRlIGNvbnRlbnQgZGltZW5zaW9uc1xuXHRcdFx0Y3VycmVudC4kc2xpZGUudHJpZ2dlcihcInJlZnJlc2hcIik7XG5cblx0XHRcdHNlbGYuJGNhcHRpb24gPSBjYXB0aW9uICYmIGNhcHRpb24ubGVuZ3RoID8gJGNhcHRpb24uaHRtbChjYXB0aW9uKSA6IG51bGw7XG5cblx0XHRcdGlmICghc2VsZi5oYXNIaWRkZW5Db250cm9scyAmJiAhc2VsZi5pc0lkbGUpIHtcblx0XHRcdFx0c2VsZi5zaG93Q29udHJvbHMoKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVXBkYXRlIGluZm8gYW5kIG5hdmlnYXRpb24gZWxlbWVudHNcblx0XHRcdCRjb250YWluZXIuZmluZChcIltkYXRhLWZhbmN5Ym94LWNvdW50XVwiKS5odG1sKHNlbGYuZ3JvdXAubGVuZ3RoKTtcblx0XHRcdCRjb250YWluZXIuZmluZChcIltkYXRhLWZhbmN5Ym94LWluZGV4XVwiKS5odG1sKGluZGV4ICsgMSk7XG5cblx0XHRcdCRjb250YWluZXIuZmluZChcIltkYXRhLWZhbmN5Ym94LXByZXZdXCIpLnByb3AoXCJkaXNhYmxlZFwiLCAhY3VycmVudC5vcHRzLmxvb3AgJiYgaW5kZXggPD0gMCk7XG5cdFx0XHQkY29udGFpbmVyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC1uZXh0XVwiKS5wcm9wKFwiZGlzYWJsZWRcIiwgIWN1cnJlbnQub3B0cy5sb29wICYmIGluZGV4ID49IHNlbGYuZ3JvdXAubGVuZ3RoIC0gMSk7XG5cblx0XHRcdGlmIChjdXJyZW50LnR5cGUgPT09IFwiaW1hZ2VcIikge1xuXHRcdFx0XHQvLyBSZS1lbmFibGUgYnV0dG9uczsgdXBkYXRlIGRvd25sb2FkIGJ1dHRvbiBzb3VyY2Vcblx0XHRcdFx0JGNvbnRhaW5lclxuXHRcdFx0XHRcdC5maW5kKFwiW2RhdGEtZmFuY3lib3gtem9vbV1cIilcblx0XHRcdFx0XHQuc2hvdygpXG5cdFx0XHRcdFx0LmVuZCgpXG5cdFx0XHRcdFx0LmZpbmQoXCJbZGF0YS1mYW5jeWJveC1kb3dubG9hZF1cIilcblx0XHRcdFx0XHQuYXR0cihcImhyZWZcIiwgY3VycmVudC5vcHRzLmltYWdlLnNyYyB8fCBjdXJyZW50LnNyYylcblx0XHRcdFx0XHQuc2hvdygpO1xuXHRcdFx0fSBlbHNlIGlmIChjdXJyZW50Lm9wdHMudG9vbGJhcikge1xuXHRcdFx0XHQkY29udGFpbmVyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC1kb3dubG9hZF0sW2RhdGEtZmFuY3lib3gtem9vbV1cIikuaGlkZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBNYWtlIHN1cmUgZm9jdXMgaXMgbm90IG9uIGRpc2FibGVkIGJ1dHRvbi9lbGVtZW50XG5cdFx0XHRpZiAoJChkb2N1bWVudC5hY3RpdmVFbGVtZW50KS5pcyhcIjpoaWRkZW4sW2Rpc2FibGVkXVwiKSkge1xuXHRcdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lci50cmlnZ2VyKFwiZm9jdXNcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIEhpZGUgdG9vbGJhciBhbmQgY2FwdGlvblxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0aGlkZUNvbnRyb2xzOiBmdW5jdGlvbihhbmRDYXB0aW9uKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGFyciA9IFtcImluZm9iYXJcIiwgXCJ0b29sYmFyXCIsIFwibmF2XCJdO1xuXG5cdFx0XHRpZiAoYW5kQ2FwdGlvbiB8fCAhc2VsZi5jdXJyZW50Lm9wdHMucHJldmVudENhcHRpb25PdmVybGFwKSB7XG5cdFx0XHRcdGFyci5wdXNoKFwiY2FwdGlvblwiKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kcmVmcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdGFyclxuXHRcdFx0XHRcdC5tYXAoZnVuY3Rpb24oaSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFwiZmFuY3lib3gtc2hvdy1cIiArIGk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuam9pbihcIiBcIilcblx0XHRcdCk7XG5cblx0XHRcdHRoaXMuaGFzSGlkZGVuQ29udHJvbHMgPSB0cnVlO1xuXHRcdH0sXG5cblx0XHRzaG93Q29udHJvbHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRvcHRzID0gc2VsZi5jdXJyZW50ID8gc2VsZi5jdXJyZW50Lm9wdHMgOiBzZWxmLm9wdHMsXG5cdFx0XHRcdCRjb250YWluZXIgPSBzZWxmLiRyZWZzLmNvbnRhaW5lcjtcblxuXHRcdFx0c2VsZi5oYXNIaWRkZW5Db250cm9scyA9IGZhbHNlO1xuXHRcdFx0c2VsZi5pZGxlU2Vjb25kc0NvdW50ZXIgPSAwO1xuXG5cdFx0XHQkY29udGFpbmVyXG5cdFx0XHRcdC50b2dnbGVDbGFzcyhcImZhbmN5Ym94LXNob3ctdG9vbGJhclwiLCAhIShvcHRzLnRvb2xiYXIgJiYgb3B0cy5idXR0b25zKSlcblx0XHRcdFx0LnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtc2hvdy1pbmZvYmFyXCIsICEhKG9wdHMuaW5mb2JhciAmJiBzZWxmLmdyb3VwLmxlbmd0aCA+IDEpKVxuXHRcdFx0XHQudG9nZ2xlQ2xhc3MoXCJmYW5jeWJveC1zaG93LWNhcHRpb25cIiwgISFzZWxmLiRjYXB0aW9uKVxuXHRcdFx0XHQudG9nZ2xlQ2xhc3MoXCJmYW5jeWJveC1zaG93LW5hdlwiLCAhIShvcHRzLmFycm93cyAmJiBzZWxmLmdyb3VwLmxlbmd0aCA+IDEpKVxuXHRcdFx0XHQudG9nZ2xlQ2xhc3MoXCJmYW5jeWJveC1pcy1tb2RhbFwiLCAhIW9wdHMubW9kYWwpO1xuXHRcdH0sXG5cblx0XHQvLyBUb2dnbGUgdG9vbGJhciBhbmQgY2FwdGlvblxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHR0b2dnbGVDb250cm9sczogZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAodGhpcy5oYXNIaWRkZW5Db250cm9scykge1xuXHRcdFx0XHR0aGlzLnNob3dDb250cm9scygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5oaWRlQ29udHJvbHMoKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG5cdCQuZmFuY3lib3ggPSB7XG5cdFx0dmVyc2lvbjogXCIzLjUuMlwiLFxuXHRcdGRlZmF1bHRzOiBkZWZhdWx0cyxcblxuXHRcdC8vIEdldCBjdXJyZW50IGluc3RhbmNlIGFuZCBleGVjdXRlIGEgY29tbWFuZC5cblx0XHQvL1xuXHRcdC8vIEV4YW1wbGVzIG9mIHVzYWdlOlxuXHRcdC8vXG5cdFx0Ly8gICAkaW5zdGFuY2UgPSAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCk7XG5cdFx0Ly8gICAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCkuanVtcFRvKCAxICk7XG5cdFx0Ly8gICAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCAnanVtcFRvJywgMSApO1xuXHRcdC8vICAgJC5mYW5jeWJveC5nZXRJbnN0YW5jZSggZnVuY3Rpb24oKSB7XG5cdFx0Ly8gICAgICAgY29uc29sZS5pbmZvKCB0aGlzLmN1cnJJbmRleCApO1xuXHRcdC8vICAgfSk7XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRnZXRJbnN0YW5jZTogZnVuY3Rpb24oY29tbWFuZCkge1xuXHRcdFx0dmFyIGluc3RhbmNlID0gJCgnLmZhbmN5Ym94LWNvbnRhaW5lcjpub3QoXCIuZmFuY3lib3gtaXMtY2xvc2luZ1wiKTpsYXN0JykuZGF0YShcIkZhbmN5Qm94XCIpLFxuXHRcdFx0XHRhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuXHRcdFx0aWYgKGluc3RhbmNlIGluc3RhbmNlb2YgRmFuY3lCb3gpIHtcblx0XHRcdFx0aWYgKCQudHlwZShjb21tYW5kKSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRcdGluc3RhbmNlW2NvbW1hbmRdLmFwcGx5KGluc3RhbmNlLCBhcmdzKTtcblx0XHRcdFx0fSBlbHNlIGlmICgkLnR5cGUoY29tbWFuZCkgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdGNvbW1hbmQuYXBwbHkoaW5zdGFuY2UsIGFyZ3MpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGluc3RhbmNlO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSxcblxuXHRcdC8vIENyZWF0ZSBuZXcgaW5zdGFuY2Vcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09XG5cblx0XHRvcGVuOiBmdW5jdGlvbihpdGVtcywgb3B0cywgaW5kZXgpIHtcblx0XHRcdHJldHVybiBuZXcgRmFuY3lCb3goaXRlbXMsIG9wdHMsIGluZGV4KTtcblx0XHR9LFxuXG5cdFx0Ly8gQ2xvc2UgY3VycmVudCBvciBhbGwgaW5zdGFuY2VzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRjbG9zZTogZnVuY3Rpb24oYWxsKSB7XG5cdFx0XHR2YXIgaW5zdGFuY2UgPSB0aGlzLmdldEluc3RhbmNlKCk7XG5cblx0XHRcdGlmIChpbnN0YW5jZSkge1xuXHRcdFx0XHRpbnN0YW5jZS5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIFRyeSB0byBmaW5kIGFuZCBjbG9zZSBuZXh0IGluc3RhbmNlXG5cdFx0XHRcdGlmIChhbGwgPT09IHRydWUpIHtcblx0XHRcdFx0XHR0aGlzLmNsb3NlKGFsbCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gQ2xvc2UgYWxsIGluc3RhbmNlcyBhbmQgdW5iaW5kIGFsbCBldmVudHNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0ZGVzdHJveTogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmNsb3NlKHRydWUpO1xuXG5cdFx0XHQkRC5hZGQoXCJib2R5XCIpLm9mZihcImNsaWNrLmZiLXN0YXJ0XCIsIFwiKipcIik7XG5cdFx0fSxcblxuXHRcdC8vIFRyeSB0byBkZXRlY3QgbW9iaWxlIGRldmljZXNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRpc01vYmlsZTogL0FuZHJvaWR8d2ViT1N8aVBob25lfGlQYWR8aVBvZHxCbGFja0JlcnJ5fElFTW9iaWxlfE9wZXJhIE1pbmkvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpLFxuXG5cdFx0Ly8gRGV0ZWN0IGlmICd0cmFuc2xhdGUzZCcgc3VwcG9ydCBpcyBhdmFpbGFibGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dXNlM2Q6IChmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHR3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSAmJlxuXHRcdFx0XHR3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkaXYpICYmXG5cdFx0XHRcdHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRpdikuZ2V0UHJvcGVydHlWYWx1ZShcInRyYW5zZm9ybVwiKSAmJlxuXHRcdFx0XHQhKGRvY3VtZW50LmRvY3VtZW50TW9kZSAmJiBkb2N1bWVudC5kb2N1bWVudE1vZGUgPCAxMSlcblx0XHRcdCk7XG5cdFx0fSkoKSxcblxuXHRcdC8vIEhlbHBlciBmdW5jdGlvbiB0byBnZXQgY3VycmVudCB2aXN1YWwgc3RhdGUgb2YgYW4gZWxlbWVudFxuXHRcdC8vIHJldHVybnMgYXJyYXlbIHRvcCwgbGVmdCwgaG9yaXpvbnRhbC1zY2FsZSwgdmVydGljYWwtc2NhbGUsIG9wYWNpdHkgXVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Z2V0VHJhbnNsYXRlOiBmdW5jdGlvbigkZWwpIHtcblx0XHRcdHZhciBkb21SZWN0O1xuXG5cdFx0XHRpZiAoISRlbCB8fCAhJGVsLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGRvbVJlY3QgPSAkZWxbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHRvcDogZG9tUmVjdC50b3AgfHwgMCxcblx0XHRcdFx0bGVmdDogZG9tUmVjdC5sZWZ0IHx8IDAsXG5cdFx0XHRcdHdpZHRoOiBkb21SZWN0LndpZHRoLFxuXHRcdFx0XHRoZWlnaHQ6IGRvbVJlY3QuaGVpZ2h0LFxuXHRcdFx0XHRvcGFjaXR5OiBwYXJzZUZsb2F0KCRlbC5jc3MoXCJvcGFjaXR5XCIpKVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0Ly8gU2hvcnRjdXQgZm9yIHNldHRpbmcgXCJ0cmFuc2xhdGUzZFwiIHByb3BlcnRpZXMgZm9yIGVsZW1lbnRcblx0XHQvLyBDYW4gc2V0IGJlIHVzZWQgdG8gc2V0IG9wYWNpdHksIHRvb1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRzZXRUcmFuc2xhdGU6IGZ1bmN0aW9uKCRlbCwgcHJvcHMpIHtcblx0XHRcdHZhciBzdHIgPSBcIlwiLFxuXHRcdFx0XHRjc3MgPSB7fTtcblxuXHRcdFx0aWYgKCEkZWwgfHwgIXByb3BzKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHByb3BzLmxlZnQgIT09IHVuZGVmaW5lZCB8fCBwcm9wcy50b3AgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRzdHIgPVxuXHRcdFx0XHRcdChwcm9wcy5sZWZ0ID09PSB1bmRlZmluZWQgPyAkZWwucG9zaXRpb24oKS5sZWZ0IDogcHJvcHMubGVmdCkgK1xuXHRcdFx0XHRcdFwicHgsIFwiICtcblx0XHRcdFx0XHQocHJvcHMudG9wID09PSB1bmRlZmluZWQgPyAkZWwucG9zaXRpb24oKS50b3AgOiBwcm9wcy50b3ApICtcblx0XHRcdFx0XHRcInB4XCI7XG5cblx0XHRcdFx0aWYgKHRoaXMudXNlM2QpIHtcblx0XHRcdFx0XHRzdHIgPSBcInRyYW5zbGF0ZTNkKFwiICsgc3RyICsgXCIsIDBweClcIjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzdHIgPSBcInRyYW5zbGF0ZShcIiArIHN0ciArIFwiKVwiO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwcm9wcy5zY2FsZVggIT09IHVuZGVmaW5lZCAmJiBwcm9wcy5zY2FsZVkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRzdHIgKz0gXCIgc2NhbGUoXCIgKyBwcm9wcy5zY2FsZVggKyBcIiwgXCIgKyBwcm9wcy5zY2FsZVkgKyBcIilcIjtcblx0XHRcdH0gZWxzZSBpZiAocHJvcHMuc2NhbGVYICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0c3RyICs9IFwiIHNjYWxlWChcIiArIHByb3BzLnNjYWxlWCArIFwiKVwiO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoc3RyLmxlbmd0aCkge1xuXHRcdFx0XHRjc3MudHJhbnNmb3JtID0gc3RyO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocHJvcHMub3BhY2l0eSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNzcy5vcGFjaXR5ID0gcHJvcHMub3BhY2l0eTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHByb3BzLndpZHRoICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y3NzLndpZHRoID0gcHJvcHMud2lkdGg7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwcm9wcy5oZWlnaHQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjc3MuaGVpZ2h0ID0gcHJvcHMuaGVpZ2h0O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gJGVsLmNzcyhjc3MpO1xuXHRcdH0sXG5cblx0XHQvLyBTaW1wbGUgQ1NTIHRyYW5zaXRpb24gaGFuZGxlclxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRhbmltYXRlOiBmdW5jdGlvbigkZWwsIHRvLCBkdXJhdGlvbiwgY2FsbGJhY2ssIGxlYXZlQW5pbWF0aW9uTmFtZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRmcm9tO1xuXG5cdFx0XHRpZiAoJC5pc0Z1bmN0aW9uKGR1cmF0aW9uKSkge1xuXHRcdFx0XHRjYWxsYmFjayA9IGR1cmF0aW9uO1xuXHRcdFx0XHRkdXJhdGlvbiA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuc3RvcCgkZWwpO1xuXG5cdFx0XHRmcm9tID0gc2VsZi5nZXRUcmFuc2xhdGUoJGVsKTtcblxuXHRcdFx0JGVsLm9uKHRyYW5zaXRpb25FbmQsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0Ly8gU2tpcCBldmVudHMgZnJvbSBjaGlsZCBlbGVtZW50cyBhbmQgei1pbmRleCBjaGFuZ2Vcblx0XHRcdFx0aWYgKGUgJiYgZS5vcmlnaW5hbEV2ZW50ICYmICghJGVsLmlzKGUub3JpZ2luYWxFdmVudC50YXJnZXQpIHx8IGUub3JpZ2luYWxFdmVudC5wcm9wZXJ0eU5hbWUgPT0gXCJ6LWluZGV4XCIpKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VsZi5zdG9wKCRlbCk7XG5cblx0XHRcdFx0aWYgKCQuaXNOdW1lcmljKGR1cmF0aW9uKSkge1xuXHRcdFx0XHRcdCRlbC5jc3MoXCJ0cmFuc2l0aW9uLWR1cmF0aW9uXCIsIFwiXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCQuaXNQbGFpbk9iamVjdCh0bykpIHtcblx0XHRcdFx0XHRpZiAodG8uc2NhbGVYICE9PSB1bmRlZmluZWQgJiYgdG8uc2NhbGVZICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdHNlbGYuc2V0VHJhbnNsYXRlKCRlbCwge1xuXHRcdFx0XHRcdFx0XHR0b3A6IHRvLnRvcCxcblx0XHRcdFx0XHRcdFx0bGVmdDogdG8ubGVmdCxcblx0XHRcdFx0XHRcdFx0d2lkdGg6IGZyb20ud2lkdGggKiB0by5zY2FsZVgsXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogZnJvbS5oZWlnaHQgKiB0by5zY2FsZVksXG5cdFx0XHRcdFx0XHRcdHNjYWxlWDogMSxcblx0XHRcdFx0XHRcdFx0c2NhbGVZOiAxXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAobGVhdmVBbmltYXRpb25OYW1lICE9PSB0cnVlKSB7XG5cdFx0XHRcdFx0JGVsLnJlbW92ZUNsYXNzKHRvKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICgkLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoJC5pc051bWVyaWMoZHVyYXRpb24pKSB7XG5cdFx0XHRcdCRlbC5jc3MoXCJ0cmFuc2l0aW9uLWR1cmF0aW9uXCIsIGR1cmF0aW9uICsgXCJtc1wiKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU3RhcnQgYW5pbWF0aW9uIGJ5IGNoYW5naW5nIENTUyBwcm9wZXJ0aWVzIG9yIGNsYXNzIG5hbWVcblx0XHRcdGlmICgkLmlzUGxhaW5PYmplY3QodG8pKSB7XG5cdFx0XHRcdGlmICh0by5zY2FsZVggIT09IHVuZGVmaW5lZCAmJiB0by5zY2FsZVkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGRlbGV0ZSB0by53aWR0aDtcblx0XHRcdFx0XHRkZWxldGUgdG8uaGVpZ2h0O1xuXG5cdFx0XHRcdFx0aWYgKCRlbC5wYXJlbnQoKS5oYXNDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1pbWFnZVwiKSkge1xuXHRcdFx0XHRcdFx0JGVsLnBhcmVudCgpLmFkZENsYXNzKFwiZmFuY3lib3gtaXMtc2NhbGluZ1wiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZSgkZWwsIHRvKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRlbC5hZGRDbGFzcyh0byk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIE1ha2Ugc3VyZSB0aGF0IGB0cmFuc2l0aW9uZW5kYCBjYWxsYmFjayBnZXRzIGZpcmVkXG5cdFx0XHQkZWwuZGF0YShcblx0XHRcdFx0XCJ0aW1lclwiLFxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCRlbC50cmlnZ2VyKHRyYW5zaXRpb25FbmQpO1xuXHRcdFx0XHR9LCBkdXJhdGlvbiArIDMzKVxuXHRcdFx0KTtcblx0XHR9LFxuXG5cdFx0c3RvcDogZnVuY3Rpb24oJGVsLCBjYWxsQ2FsbGJhY2spIHtcblx0XHRcdGlmICgkZWwgJiYgJGVsLmxlbmd0aCkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQoJGVsLmRhdGEoXCJ0aW1lclwiKSk7XG5cblx0XHRcdFx0aWYgKGNhbGxDYWxsYmFjaykge1xuXHRcdFx0XHRcdCRlbC50cmlnZ2VyKHRyYW5zaXRpb25FbmQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JGVsLm9mZih0cmFuc2l0aW9uRW5kKS5jc3MoXCJ0cmFuc2l0aW9uLWR1cmF0aW9uXCIsIFwiXCIpO1xuXG5cdFx0XHRcdCRlbC5wYXJlbnQoKS5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLXNjYWxpbmdcIik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdC8vIERlZmF1bHQgY2xpY2sgaGFuZGxlciBmb3IgXCJmYW5jeWJveGVkXCIgbGlua3Ncblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRmdW5jdGlvbiBfcnVuKGUsIG9wdHMpIHtcblx0XHR2YXIgaXRlbXMgPSBbXSxcblx0XHRcdGluZGV4ID0gMCxcblx0XHRcdCR0YXJnZXQsXG5cdFx0XHR2YWx1ZSxcblx0XHRcdGluc3RhbmNlO1xuXG5cdFx0Ly8gQXZvaWQgb3BlbmluZyBtdWx0aXBsZSB0aW1lc1xuXHRcdGlmIChlICYmIGUuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRvcHRzID0gb3B0cyB8fCB7fTtcblxuXHRcdGlmIChlICYmIGUuZGF0YSkge1xuXHRcdFx0b3B0cyA9IG1lcmdlT3B0cyhlLmRhdGEub3B0aW9ucywgb3B0cyk7XG5cdFx0fVxuXG5cdFx0JHRhcmdldCA9IG9wdHMuJHRhcmdldCB8fCAkKGUuY3VycmVudFRhcmdldCkudHJpZ2dlcihcImJsdXJcIik7XG5cdFx0aW5zdGFuY2UgPSAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCk7XG5cblx0XHRpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuJHRyaWdnZXIgJiYgaW5zdGFuY2UuJHRyaWdnZXIuaXMoJHRhcmdldCkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAob3B0cy5zZWxlY3Rvcikge1xuXHRcdFx0aXRlbXMgPSAkKG9wdHMuc2VsZWN0b3IpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBHZXQgYWxsIHJlbGF0ZWQgaXRlbXMgYW5kIGZpbmQgaW5kZXggZm9yIGNsaWNrZWQgb25lXG5cdFx0XHR2YWx1ZSA9ICR0YXJnZXQuYXR0cihcImRhdGEtZmFuY3lib3hcIikgfHwgXCJcIjtcblxuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdGl0ZW1zID0gZS5kYXRhID8gZS5kYXRhLml0ZW1zIDogW107XG5cdFx0XHRcdGl0ZW1zID0gaXRlbXMubGVuZ3RoID8gaXRlbXMuZmlsdGVyKCdbZGF0YS1mYW5jeWJveD1cIicgKyB2YWx1ZSArICdcIl0nKSA6ICQoJ1tkYXRhLWZhbmN5Ym94PVwiJyArIHZhbHVlICsgJ1wiXScpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aXRlbXMgPSBbJHRhcmdldF07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aW5kZXggPSAkKGl0ZW1zKS5pbmRleCgkdGFyZ2V0KTtcblxuXHRcdC8vIFNvbWV0aW1lcyBjdXJyZW50IGl0ZW0gY2FuIG5vdCBiZSBmb3VuZFxuXHRcdGlmIChpbmRleCA8IDApIHtcblx0XHRcdGluZGV4ID0gMDtcblx0XHR9XG5cblx0XHRpbnN0YW5jZSA9ICQuZmFuY3lib3gub3BlbihpdGVtcywgb3B0cywgaW5kZXgpO1xuXG5cdFx0Ly8gU2F2ZSBsYXN0IGFjdGl2ZSBlbGVtZW50XG5cdFx0aW5zdGFuY2UuJHRyaWdnZXIgPSAkdGFyZ2V0O1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgalF1ZXJ5IHBsdWdpblxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09XG5cblx0JC5mbi5mYW5jeWJveCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgc2VsZWN0b3I7XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHRzZWxlY3RvciA9IG9wdGlvbnMuc2VsZWN0b3IgfHwgZmFsc2U7XG5cblx0XHRpZiAoc2VsZWN0b3IpIHtcblx0XHRcdC8vIFVzZSBib2R5IGVsZW1lbnQgaW5zdGVhZCBvZiBkb2N1bWVudCBzbyBpdCBleGVjdXRlcyBmaXJzdFxuXHRcdFx0JChcImJvZHlcIilcblx0XHRcdFx0Lm9mZihcImNsaWNrLmZiLXN0YXJ0XCIsIHNlbGVjdG9yKVxuXHRcdFx0XHQub24oXCJjbGljay5mYi1zdGFydFwiLCBzZWxlY3Rvciwge29wdGlvbnM6IG9wdGlvbnN9LCBfcnVuKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5vZmYoXCJjbGljay5mYi1zdGFydFwiKS5vbihcblx0XHRcdFx0XCJjbGljay5mYi1zdGFydFwiLFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aXRlbXM6IHRoaXMsXG5cdFx0XHRcdFx0b3B0aW9uczogb3B0aW9uc1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRfcnVuXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdC8vIFNlbGYgaW5pdGlhbGl6aW5nIHBsdWdpbiBmb3IgYWxsIGVsZW1lbnRzIGhhdmluZyBgZGF0YS1mYW5jeWJveGAgYXR0cmlidXRlXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0JEQub24oXCJjbGljay5mYi1zdGFydFwiLCBcIltkYXRhLWZhbmN5Ym94XVwiLCBfcnVuKTtcblxuXHQvLyBFbmFibGUgXCJ0cmlnZ2VyIGVsZW1lbnRzXCJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdCRELm9uKFwiY2xpY2suZmItc3RhcnRcIiwgXCJbZGF0YS1mYW5jeWJveC10cmlnZ2VyXVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0JCgnW2RhdGEtZmFuY3lib3g9XCInICsgJCh0aGlzKS5hdHRyKFwiZGF0YS1mYW5jeWJveC10cmlnZ2VyXCIpICsgJ1wiXScpXG5cdFx0XHQuZXEoJCh0aGlzKS5hdHRyKFwiZGF0YS1mYW5jeWJveC1pbmRleFwiKSB8fCAwKVxuXHRcdFx0LnRyaWdnZXIoXCJjbGljay5mYi1zdGFydFwiLCB7XG5cdFx0XHRcdCR0cmlnZ2VyOiAkKHRoaXMpXG5cdFx0XHR9KTtcblx0fSk7XG5cblx0Ly8gVHJhY2sgZm9jdXMgZXZlbnQgZm9yIGJldHRlciBhY2Nlc3NpYmlsaXR5IHN0eWxpbmdcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0KGZ1bmN0aW9uKCkge1xuXHRcdHZhciBidXR0b25TdHIgPSBcIi5mYW5jeWJveC1idXR0b25cIixcblx0XHRcdGZvY3VzU3RyID0gXCJmYW5jeWJveC1mb2N1c1wiLFxuXHRcdFx0JHByZXNzZWQgPSBudWxsO1xuXG5cdFx0JEQub24oXCJtb3VzZWRvd24gbW91c2V1cCBmb2N1cyBibHVyXCIsIGJ1dHRvblN0ciwgZnVuY3Rpb24oZSkge1xuXHRcdFx0c3dpdGNoIChlLnR5cGUpIHtcblx0XHRcdFx0Y2FzZSBcIm1vdXNlZG93blwiOlxuXHRcdFx0XHRcdCRwcmVzc2VkID0gJCh0aGlzKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBcIm1vdXNldXBcIjpcblx0XHRcdFx0XHQkcHJlc3NlZCA9IG51bGw7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJmb2N1c2luXCI6XG5cdFx0XHRcdFx0JChidXR0b25TdHIpLnJlbW92ZUNsYXNzKGZvY3VzU3RyKTtcblxuXHRcdFx0XHRcdGlmICghJCh0aGlzKS5pcygkcHJlc3NlZCkgJiYgISQodGhpcykuaXMoXCJbZGlzYWJsZWRdXCIpKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKGZvY3VzU3RyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJmb2N1c291dFwiOlxuXHRcdFx0XHRcdCQoYnV0dG9uU3RyKS5yZW1vdmVDbGFzcyhmb2N1c1N0cik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pKCk7XG59KSh3aW5kb3csIGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIE1lZGlhXG4vLyBBZGRzIGFkZGl0aW9uYWwgbWVkaWEgdHlwZSBzdXBwb3J0XG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbigkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdC8vIE9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgZm9yIGVhY2ggbWVkaWEgdHlwZVxuXHR2YXIgZGVmYXVsdHMgPSB7XG5cdFx0eW91dHViZToge1xuXHRcdFx0bWF0Y2hlcjogLyh5b3V0dWJlXFwuY29tfHlvdXR1XFwuYmV8eW91dHViZVxcLW5vY29va2llXFwuY29tKVxcLyh3YXRjaFxcPyguKiYpP3Y9fHZcXC98dVxcL3xlbWJlZFxcLz8pPyh2aWRlb3Nlcmllc1xcP2xpc3Q9KC4qKXxbXFx3LV17MTF9fFxcP2xpc3RUeXBlPSguKikmbGlzdD0oLiopKSguKikvaSxcblx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRhdXRvcGxheTogMSxcblx0XHRcdFx0YXV0b2hpZGU6IDEsXG5cdFx0XHRcdGZzOiAxLFxuXHRcdFx0XHRyZWw6IDAsXG5cdFx0XHRcdGhkOiAxLFxuXHRcdFx0XHR3bW9kZTogXCJ0cmFuc3BhcmVudFwiLFxuXHRcdFx0XHRlbmFibGVqc2FwaTogMSxcblx0XHRcdFx0aHRtbDU6IDFcblx0XHRcdH0sXG5cdFx0XHRwYXJhbVBsYWNlOiA4LFxuXHRcdFx0dHlwZTogXCJpZnJhbWVcIixcblx0XHRcdHVybDogXCIvL3d3dy55b3V0dWJlLW5vY29va2llLmNvbS9lbWJlZC8kNFwiLFxuXHRcdFx0dGh1bWI6IFwiLy9pbWcueW91dHViZS5jb20vdmkvJDQvaHFkZWZhdWx0LmpwZ1wiXG5cdFx0fSxcblxuXHRcdHZpbWVvOiB7XG5cdFx0XHRtYXRjaGVyOiAvXi4rdmltZW8uY29tXFwvKC4qXFwvKT8oW1xcZF0rKSguKik/Lyxcblx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRhdXRvcGxheTogMSxcblx0XHRcdFx0aGQ6IDEsXG5cdFx0XHRcdHNob3dfdGl0bGU6IDEsXG5cdFx0XHRcdHNob3dfYnlsaW5lOiAxLFxuXHRcdFx0XHRzaG93X3BvcnRyYWl0OiAwLFxuXHRcdFx0XHRmdWxsc2NyZWVuOiAxXG5cdFx0XHR9LFxuXHRcdFx0cGFyYW1QbGFjZTogMyxcblx0XHRcdHR5cGU6IFwiaWZyYW1lXCIsXG5cdFx0XHR1cmw6IFwiLy9wbGF5ZXIudmltZW8uY29tL3ZpZGVvLyQyXCJcblx0XHR9LFxuXG5cdFx0aW5zdGFncmFtOiB7XG5cdFx0XHRtYXRjaGVyOiAvKGluc3RhZ3JcXC5hbXxpbnN0YWdyYW1cXC5jb20pXFwvcFxcLyhbYS16QS1aMC05X1xcLV0rKVxcLz8vaSxcblx0XHRcdHR5cGU6IFwiaW1hZ2VcIixcblx0XHRcdHVybDogXCIvLyQxL3AvJDIvbWVkaWEvP3NpemU9bFwiXG5cdFx0fSxcblxuXHRcdC8vIEV4YW1wbGVzOlxuXHRcdC8vIGh0dHA6Ly9tYXBzLmdvb2dsZS5jb20vP2xsPTQ4Ljg1Nzk5NSwyLjI5NDI5NyZzcG49MC4wMDc2NjYsMC4wMjExMzYmdD1tJno9MTZcblx0XHQvLyBodHRwczovL3d3dy5nb29nbGUuY29tL21hcHMvQDM3Ljc4NTIwMDYsLTEyMi40MTQ2MzU1LDE0LjY1elxuXHRcdC8vIGh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vbWFwcy9ANTIuMjExMTEyMywyLjkyMzc1NDIsNi42MXo/aGw9ZW5cblx0XHQvLyBodHRwczovL3d3dy5nb29nbGUuY29tL21hcHMvcGxhY2UvR29vZ2xlcGxleC9AMzcuNDIyMDA0MSwtMTIyLjA4MzM0OTQsMTd6L2RhdGE9ITRtNSEzbTQhMXMweDA6MHg2YzI5NmM2NjYxOTM2N2UwIThtMiEzZDM3LjQyMTk5OTghNGQtMTIyLjA4NDA1NzJcblx0XHRnbWFwX3BsYWNlOiB7XG5cdFx0XHRtYXRjaGVyOiAvKG1hcHNcXC4pP2dvb2dsZVxcLihbYS16XXsyLDN9KFxcLlthLXpdezJ9KT8pXFwvKCgobWFwc1xcLyhwbGFjZVxcLyguKilcXC8pP1xcQCguKiksKFxcZCsuP1xcZCs/KXopKXwoXFw/bGw9KSkoLiopPy9pLFxuXHRcdFx0dHlwZTogXCJpZnJhbWVcIixcblx0XHRcdHVybDogZnVuY3Rpb24ocmV6KSB7XG5cdFx0XHRcdHJldHVybiAoXG5cdFx0XHRcdFx0XCIvL21hcHMuZ29vZ2xlLlwiICtcblx0XHRcdFx0XHRyZXpbMl0gK1xuXHRcdFx0XHRcdFwiLz9sbD1cIiArXG5cdFx0XHRcdFx0KHJlels5XSA/IHJlels5XSArIFwiJno9XCIgKyBNYXRoLmZsb29yKHJlelsxMF0pICsgKHJlelsxMl0gPyByZXpbMTJdLnJlcGxhY2UoL15cXC8vLCBcIiZcIikgOiBcIlwiKSA6IHJlelsxMl0gKyBcIlwiKS5yZXBsYWNlKC9cXD8vLCBcIiZcIikgK1xuXHRcdFx0XHRcdFwiJm91dHB1dD1cIiArXG5cdFx0XHRcdFx0KHJlelsxMl0gJiYgcmV6WzEyXS5pbmRleE9mKFwibGF5ZXI9Y1wiKSA+IDAgPyBcInN2ZW1iZWRcIiA6IFwiZW1iZWRcIilcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gRXhhbXBsZXM6XG5cdFx0Ly8gaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9tYXBzL3NlYXJjaC9FbXBpcmUrU3RhdGUrQnVpbGRpbmcvXG5cdFx0Ly8gaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9tYXBzL3NlYXJjaC8/YXBpPTEmcXVlcnk9Y2VudHVyeWxpbmsrZmllbGRcblx0XHQvLyBodHRwczovL3d3dy5nb29nbGUuY29tL21hcHMvc2VhcmNoLz9hcGk9MSZxdWVyeT00Ny41OTUxNTE4LC0xMjIuMzMxNjM5M1xuXHRcdGdtYXBfc2VhcmNoOiB7XG5cdFx0XHRtYXRjaGVyOiAvKG1hcHNcXC4pP2dvb2dsZVxcLihbYS16XXsyLDN9KFxcLlthLXpdezJ9KT8pXFwvKG1hcHNcXC9zZWFyY2hcXC8pKC4qKS9pLFxuXHRcdFx0dHlwZTogXCJpZnJhbWVcIixcblx0XHRcdHVybDogZnVuY3Rpb24ocmV6KSB7XG5cdFx0XHRcdHJldHVybiBcIi8vbWFwcy5nb29nbGUuXCIgKyByZXpbMl0gKyBcIi9tYXBzP3E9XCIgKyByZXpbNV0ucmVwbGFjZShcInF1ZXJ5PVwiLCBcInE9XCIpLnJlcGxhY2UoXCJhcGk9MVwiLCBcIlwiKSArIFwiJm91dHB1dD1lbWJlZFwiO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvLyBGb3JtYXRzIG1hdGNoaW5nIHVybCB0byBmaW5hbCBmb3JtXG5cdHZhciBmb3JtYXQgPSBmdW5jdGlvbih1cmwsIHJleiwgcGFyYW1zKSB7XG5cdFx0aWYgKCF1cmwpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRwYXJhbXMgPSBwYXJhbXMgfHwgXCJcIjtcblxuXHRcdGlmICgkLnR5cGUocGFyYW1zKSA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0cGFyYW1zID0gJC5wYXJhbShwYXJhbXMsIHRydWUpO1xuXHRcdH1cblxuXHRcdCQuZWFjaChyZXosIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0XHRcdHVybCA9IHVybC5yZXBsYWNlKFwiJFwiICsga2V5LCB2YWx1ZSB8fCBcIlwiKTtcblx0XHR9KTtcblxuXHRcdGlmIChwYXJhbXMubGVuZ3RoKSB7XG5cdFx0XHR1cmwgKz0gKHVybC5pbmRleE9mKFwiP1wiKSA+IDAgPyBcIiZcIiA6IFwiP1wiKSArIHBhcmFtcztcblx0XHR9XG5cblx0XHRyZXR1cm4gdXJsO1xuXHR9O1xuXG5cdCQoZG9jdW1lbnQpLm9uKFwib2JqZWN0TmVlZHNUeXBlLmZiXCIsIGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBpdGVtKSB7XG5cdFx0dmFyIHVybCA9IGl0ZW0uc3JjIHx8IFwiXCIsXG5cdFx0XHR0eXBlID0gZmFsc2UsXG5cdFx0XHRtZWRpYSxcblx0XHRcdHRodW1iLFxuXHRcdFx0cmV6LFxuXHRcdFx0cGFyYW1zLFxuXHRcdFx0dXJsUGFyYW1zLFxuXHRcdFx0cGFyYW1PYmosXG5cdFx0XHRwcm92aWRlcjtcblxuXHRcdG1lZGlhID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBpdGVtLm9wdHMubWVkaWEpO1xuXG5cdFx0Ly8gTG9vayBmb3IgYW55IG1hdGNoaW5nIG1lZGlhIHR5cGVcblx0XHQkLmVhY2gobWVkaWEsIGZ1bmN0aW9uKHByb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRzKSB7XG5cdFx0XHRyZXogPSB1cmwubWF0Y2gocHJvdmlkZXJPcHRzLm1hdGNoZXIpO1xuXG5cdFx0XHRpZiAoIXJleikge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHR5cGUgPSBwcm92aWRlck9wdHMudHlwZTtcblx0XHRcdHByb3ZpZGVyID0gcHJvdmlkZXJOYW1lO1xuXHRcdFx0cGFyYW1PYmogPSB7fTtcblxuXHRcdFx0aWYgKHByb3ZpZGVyT3B0cy5wYXJhbVBsYWNlICYmIHJleltwcm92aWRlck9wdHMucGFyYW1QbGFjZV0pIHtcblx0XHRcdFx0dXJsUGFyYW1zID0gcmV6W3Byb3ZpZGVyT3B0cy5wYXJhbVBsYWNlXTtcblxuXHRcdFx0XHRpZiAodXJsUGFyYW1zWzBdID09IFwiP1wiKSB7XG5cdFx0XHRcdFx0dXJsUGFyYW1zID0gdXJsUGFyYW1zLnN1YnN0cmluZygxKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHVybFBhcmFtcyA9IHVybFBhcmFtcy5zcGxpdChcIiZcIik7XG5cblx0XHRcdFx0Zm9yICh2YXIgbSA9IDA7IG0gPCB1cmxQYXJhbXMubGVuZ3RoOyArK20pIHtcblx0XHRcdFx0XHR2YXIgcCA9IHVybFBhcmFtc1ttXS5zcGxpdChcIj1cIiwgMik7XG5cblx0XHRcdFx0XHRpZiAocC5sZW5ndGggPT0gMikge1xuXHRcdFx0XHRcdFx0cGFyYW1PYmpbcFswXV0gPSBkZWNvZGVVUklDb21wb25lbnQocFsxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cGFyYW1zID0gJC5leHRlbmQodHJ1ZSwge30sIHByb3ZpZGVyT3B0cy5wYXJhbXMsIGl0ZW0ub3B0c1twcm92aWRlck5hbWVdLCBwYXJhbU9iaik7XG5cblx0XHRcdHVybCA9XG5cdFx0XHRcdCQudHlwZShwcm92aWRlck9wdHMudXJsKSA9PT0gXCJmdW5jdGlvblwiID8gcHJvdmlkZXJPcHRzLnVybC5jYWxsKHRoaXMsIHJleiwgcGFyYW1zLCBpdGVtKSA6IGZvcm1hdChwcm92aWRlck9wdHMudXJsLCByZXosIHBhcmFtcyk7XG5cblx0XHRcdHRodW1iID1cblx0XHRcdFx0JC50eXBlKHByb3ZpZGVyT3B0cy50aHVtYikgPT09IFwiZnVuY3Rpb25cIiA/IHByb3ZpZGVyT3B0cy50aHVtYi5jYWxsKHRoaXMsIHJleiwgcGFyYW1zLCBpdGVtKSA6IGZvcm1hdChwcm92aWRlck9wdHMudGh1bWIsIHJleik7XG5cblx0XHRcdGlmIChwcm92aWRlck5hbWUgPT09IFwieW91dHViZVwiKSB7XG5cdFx0XHRcdHVybCA9IHVybC5yZXBsYWNlKC8mdD0oKFxcZCspbSk/KFxcZCspcy8sIGZ1bmN0aW9uKG1hdGNoLCBwMSwgbSwgcykge1xuXHRcdFx0XHRcdHJldHVybiBcIiZzdGFydD1cIiArICgobSA/IHBhcnNlSW50KG0sIDEwKSAqIDYwIDogMCkgKyBwYXJzZUludChzLCAxMCkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSBpZiAocHJvdmlkZXJOYW1lID09PSBcInZpbWVvXCIpIHtcblx0XHRcdFx0dXJsID0gdXJsLnJlcGxhY2UoXCImJTIzXCIsIFwiI1wiKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXG5cdFx0Ly8gSWYgaXQgaXMgZm91bmQsIHRoZW4gY2hhbmdlIGNvbnRlbnQgdHlwZSBhbmQgdXBkYXRlIHRoZSB1cmxcblxuXHRcdGlmICh0eXBlKSB7XG5cdFx0XHRpZiAoIWl0ZW0ub3B0cy50aHVtYiAmJiAhKGl0ZW0ub3B0cy4kdGh1bWIgJiYgaXRlbS5vcHRzLiR0aHVtYi5sZW5ndGgpKSB7XG5cdFx0XHRcdGl0ZW0ub3B0cy50aHVtYiA9IHRodW1iO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodHlwZSA9PT0gXCJpZnJhbWVcIikge1xuXHRcdFx0XHRpdGVtLm9wdHMgPSAkLmV4dGVuZCh0cnVlLCBpdGVtLm9wdHMsIHtcblx0XHRcdFx0XHRpZnJhbWU6IHtcblx0XHRcdFx0XHRcdHByZWxvYWQ6IGZhbHNlLFxuXHRcdFx0XHRcdFx0YXR0cjoge1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxpbmc6IFwibm9cIlxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdCQuZXh0ZW5kKGl0ZW0sIHtcblx0XHRcdFx0dHlwZTogdHlwZSxcblx0XHRcdFx0c3JjOiB1cmwsXG5cdFx0XHRcdG9yaWdTcmM6IGl0ZW0uc3JjLFxuXHRcdFx0XHRjb250ZW50U291cmNlOiBwcm92aWRlcixcblx0XHRcdFx0Y29udGVudFR5cGU6IHR5cGUgPT09IFwiaW1hZ2VcIiA/IFwiaW1hZ2VcIiA6IHByb3ZpZGVyID09IFwiZ21hcF9wbGFjZVwiIHx8IHByb3ZpZGVyID09IFwiZ21hcF9zZWFyY2hcIiA/IFwibWFwXCIgOiBcInZpZGVvXCJcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSBpZiAodXJsKSB7XG5cdFx0XHRpdGVtLnR5cGUgPSBpdGVtLm9wdHMuZGVmYXVsdFR5cGU7XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBMb2FkIFlvdVR1YmUvVmlkZW8gQVBJIG9uIHJlcXVlc3QgdG8gZGV0ZWN0IHdoZW4gdmlkZW8gZmluaXNoZWQgcGxheWluZ1xuXHR2YXIgVmlkZW9BUElMb2FkZXIgPSB7XG5cdFx0eW91dHViZToge1xuXHRcdFx0c3JjOiBcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2lmcmFtZV9hcGlcIixcblx0XHRcdGNsYXNzOiBcIllUXCIsXG5cdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdGxvYWRlZDogZmFsc2Vcblx0XHR9LFxuXG5cdFx0dmltZW86IHtcblx0XHRcdHNyYzogXCJodHRwczovL3BsYXllci52aW1lby5jb20vYXBpL3BsYXllci5qc1wiLFxuXHRcdFx0Y2xhc3M6IFwiVmltZW9cIixcblx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0bG9hZGVkOiBmYWxzZVxuXHRcdH0sXG5cblx0XHRsb2FkOiBmdW5jdGlvbih2ZW5kb3IpIHtcblx0XHRcdHZhciBfdGhpcyA9IHRoaXMsXG5cdFx0XHRcdHNjcmlwdDtcblxuXHRcdFx0aWYgKHRoaXNbdmVuZG9yXS5sb2FkZWQpIHtcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRfdGhpcy5kb25lKHZlbmRvcik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzW3ZlbmRvcl0ubG9hZGluZykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXNbdmVuZG9yXS5sb2FkaW5nID0gdHJ1ZTtcblxuXHRcdFx0c2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcblx0XHRcdHNjcmlwdC50eXBlID0gXCJ0ZXh0L2phdmFzY3JpcHRcIjtcblx0XHRcdHNjcmlwdC5zcmMgPSB0aGlzW3ZlbmRvcl0uc3JjO1xuXG5cdFx0XHRpZiAodmVuZG9yID09PSBcInlvdXR1YmVcIikge1xuXHRcdFx0XHR3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRfdGhpc1t2ZW5kb3JdLmxvYWRlZCA9IHRydWU7XG5cdFx0XHRcdFx0X3RoaXMuZG9uZSh2ZW5kb3IpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2NyaXB0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdF90aGlzW3ZlbmRvcl0ubG9hZGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRfdGhpcy5kb25lKHZlbmRvcik7XG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcblx0XHR9LFxuXHRcdGRvbmU6IGZ1bmN0aW9uKHZlbmRvcikge1xuXHRcdFx0dmFyIGluc3RhbmNlLCAkZWwsIHBsYXllcjtcblxuXHRcdFx0aWYgKHZlbmRvciA9PT0gXCJ5b3V0dWJlXCIpIHtcblx0XHRcdFx0ZGVsZXRlIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeTtcblx0XHRcdH1cblxuXHRcdFx0aW5zdGFuY2UgPSAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCk7XG5cblx0XHRcdGlmIChpbnN0YW5jZSkge1xuXHRcdFx0XHQkZWwgPSBpbnN0YW5jZS5jdXJyZW50LiRjb250ZW50LmZpbmQoXCJpZnJhbWVcIik7XG5cblx0XHRcdFx0aWYgKHZlbmRvciA9PT0gXCJ5b3V0dWJlXCIgJiYgWVQgIT09IHVuZGVmaW5lZCAmJiBZVCkge1xuXHRcdFx0XHRcdHBsYXllciA9IG5ldyBZVC5QbGF5ZXIoJGVsLmF0dHIoXCJpZFwiKSwge1xuXHRcdFx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0XHRcdG9uU3RhdGVDaGFuZ2U6IGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoZS5kYXRhID09IDApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGluc3RhbmNlLm5leHQoKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIGlmICh2ZW5kb3IgPT09IFwidmltZW9cIiAmJiBWaW1lbyAhPT0gdW5kZWZpbmVkICYmIFZpbWVvKSB7XG5cdFx0XHRcdFx0cGxheWVyID0gbmV3IFZpbWVvLlBsYXllcigkZWwpO1xuXG5cdFx0XHRcdFx0cGxheWVyLm9uKFwiZW5kZWRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpbnN0YW5jZS5uZXh0KCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0JChkb2N1bWVudCkub24oe1xuXHRcdFwiYWZ0ZXJTaG93LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBjdXJyZW50KSB7XG5cdFx0XHRpZiAoaW5zdGFuY2UuZ3JvdXAubGVuZ3RoID4gMSAmJiAoY3VycmVudC5jb250ZW50U291cmNlID09PSBcInlvdXR1YmVcIiB8fCBjdXJyZW50LmNvbnRlbnRTb3VyY2UgPT09IFwidmltZW9cIikpIHtcblx0XHRcdFx0VmlkZW9BUElMb2FkZXIubG9hZChjdXJyZW50LmNvbnRlbnRTb3VyY2UpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59KShqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIEd1ZXN0dXJlc1xuLy8gQWRkcyB0b3VjaCBndWVzdHVyZXMsIGhhbmRsZXMgY2xpY2sgYW5kIHRhcCBldmVudHNcbi8vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuKGZ1bmN0aW9uKHdpbmRvdywgZG9jdW1lbnQsICQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0dmFyIHJlcXVlc3RBRnJhbWUgPSAoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHQvLyBpZiBhbGwgZWxzZSBmYWlscywgdXNlIHNldFRpbWVvdXRcblx0XHRcdGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRcdHJldHVybiB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9KSgpO1xuXG5cdHZhciBjYW5jZWxBRnJhbWUgPSAoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHR3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5vQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoaWQpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH0pKCk7XG5cblx0dmFyIGdldFBvaW50ZXJYWSA9IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgcmVzdWx0ID0gW107XG5cblx0XHRlID0gZS5vcmlnaW5hbEV2ZW50IHx8IGUgfHwgd2luZG93LmU7XG5cdFx0ZSA9IGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID8gZS50b3VjaGVzIDogZS5jaGFuZ2VkVG91Y2hlcyAmJiBlLmNoYW5nZWRUb3VjaGVzLmxlbmd0aCA/IGUuY2hhbmdlZFRvdWNoZXMgOiBbZV07XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gZSkge1xuXHRcdFx0aWYgKGVba2V5XS5wYWdlWCkge1xuXHRcdFx0XHRyZXN1bHQucHVzaCh7XG5cdFx0XHRcdFx0eDogZVtrZXldLnBhZ2VYLFxuXHRcdFx0XHRcdHk6IGVba2V5XS5wYWdlWVxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSBpZiAoZVtrZXldLmNsaWVudFgpIHtcblx0XHRcdFx0cmVzdWx0LnB1c2goe1xuXHRcdFx0XHRcdHg6IGVba2V5XS5jbGllbnRYLFxuXHRcdFx0XHRcdHk6IGVba2V5XS5jbGllbnRZXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH07XG5cblx0dmFyIGRpc3RhbmNlID0gZnVuY3Rpb24ocG9pbnQyLCBwb2ludDEsIHdoYXQpIHtcblx0XHRpZiAoIXBvaW50MSB8fCAhcG9pbnQyKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cblx0XHRpZiAod2hhdCA9PT0gXCJ4XCIpIHtcblx0XHRcdHJldHVybiBwb2ludDIueCAtIHBvaW50MS54O1xuXHRcdH0gZWxzZSBpZiAod2hhdCA9PT0gXCJ5XCIpIHtcblx0XHRcdHJldHVybiBwb2ludDIueSAtIHBvaW50MS55O1xuXHRcdH1cblxuXHRcdHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3cocG9pbnQyLnggLSBwb2ludDEueCwgMikgKyBNYXRoLnBvdyhwb2ludDIueSAtIHBvaW50MS55LCAyKSk7XG5cdH07XG5cblx0dmFyIGlzQ2xpY2thYmxlID0gZnVuY3Rpb24oJGVsKSB7XG5cdFx0aWYgKFxuXHRcdFx0JGVsLmlzKCdhLGFyZWEsYnV0dG9uLFtyb2xlPVwiYnV0dG9uXCJdLGlucHV0LGxhYmVsLHNlbGVjdCxzdW1tYXJ5LHRleHRhcmVhLHZpZGVvLGF1ZGlvLGlmcmFtZScpIHx8XG5cdFx0XHQkLmlzRnVuY3Rpb24oJGVsLmdldCgwKS5vbmNsaWNrKSB8fFxuXHRcdFx0JGVsLmRhdGEoXCJzZWxlY3RhYmxlXCIpXG5cdFx0KSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBDaGVjayBmb3IgYXR0cmlidXRlcyBsaWtlIGRhdGEtZmFuY3lib3gtbmV4dCBvciBkYXRhLWZhbmN5Ym94LWNsb3NlXG5cdFx0Zm9yICh2YXIgaSA9IDAsIGF0dHMgPSAkZWxbMF0uYXR0cmlidXRlcywgbiA9IGF0dHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG5cdFx0XHRpZiAoYXR0c1tpXS5ub2RlTmFtZS5zdWJzdHIoMCwgMTQpID09PSBcImRhdGEtZmFuY3lib3gtXCIpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xuXG5cdHZhciBoYXNTY3JvbGxiYXJzID0gZnVuY3Rpb24oZWwpIHtcblx0XHR2YXIgb3ZlcmZsb3dZID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwpW1wib3ZlcmZsb3cteVwiXSxcblx0XHRcdG92ZXJmbG93WCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKVtcIm92ZXJmbG93LXhcIl0sXG5cdFx0XHR2ZXJ0aWNhbCA9IChvdmVyZmxvd1kgPT09IFwic2Nyb2xsXCIgfHwgb3ZlcmZsb3dZID09PSBcImF1dG9cIikgJiYgZWwuc2Nyb2xsSGVpZ2h0ID4gZWwuY2xpZW50SGVpZ2h0LFxuXHRcdFx0aG9yaXpvbnRhbCA9IChvdmVyZmxvd1ggPT09IFwic2Nyb2xsXCIgfHwgb3ZlcmZsb3dYID09PSBcImF1dG9cIikgJiYgZWwuc2Nyb2xsV2lkdGggPiBlbC5jbGllbnRXaWR0aDtcblxuXHRcdHJldHVybiB2ZXJ0aWNhbCB8fCBob3Jpem9udGFsO1xuXHR9O1xuXG5cdHZhciBpc1Njcm9sbGFibGUgPSBmdW5jdGlvbigkZWwpIHtcblx0XHR2YXIgcmV6ID0gZmFsc2U7XG5cblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0cmV6ID0gaGFzU2Nyb2xsYmFycygkZWwuZ2V0KDApKTtcblxuXHRcdFx0aWYgKHJleikge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0JGVsID0gJGVsLnBhcmVudCgpO1xuXG5cdFx0XHRpZiAoISRlbC5sZW5ndGggfHwgJGVsLmhhc0NsYXNzKFwiZmFuY3lib3gtc3RhZ2VcIikgfHwgJGVsLmlzKFwiYm9keVwiKSkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gcmV6O1xuXHR9O1xuXG5cdHZhciBHdWVzdHVyZXMgPSBmdW5jdGlvbihpbnN0YW5jZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuaW5zdGFuY2UgPSBpbnN0YW5jZTtcblxuXHRcdHNlbGYuJGJnID0gaW5zdGFuY2UuJHJlZnMuYmc7XG5cdFx0c2VsZi4kc3RhZ2UgPSBpbnN0YW5jZS4kcmVmcy5zdGFnZTtcblx0XHRzZWxmLiRjb250YWluZXIgPSBpbnN0YW5jZS4kcmVmcy5jb250YWluZXI7XG5cblx0XHRzZWxmLmRlc3Ryb3koKTtcblxuXHRcdHNlbGYuJGNvbnRhaW5lci5vbihcInRvdWNoc3RhcnQuZmIudG91Y2ggbW91c2Vkb3duLmZiLnRvdWNoXCIsICQucHJveHkoc2VsZiwgXCJvbnRvdWNoc3RhcnRcIikpO1xuXHR9O1xuXG5cdEd1ZXN0dXJlcy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuJGNvbnRhaW5lci5vZmYoXCIuZmIudG91Y2hcIik7XG5cblx0XHQkKGRvY3VtZW50KS5vZmYoXCIuZmIudG91Y2hcIik7XG5cblx0XHRpZiAoc2VsZi5yZXF1ZXN0SWQpIHtcblx0XHRcdGNhbmNlbEFGcmFtZShzZWxmLnJlcXVlc3RJZCk7XG5cdFx0XHRzZWxmLnJlcXVlc3RJZCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0aWYgKHNlbGYudGFwcGVkKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQoc2VsZi50YXBwZWQpO1xuXHRcdFx0c2VsZi50YXBwZWQgPSBudWxsO1xuXHRcdH1cblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9udG91Y2hzdGFydCA9IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHQkdGFyZ2V0ID0gJChlLnRhcmdldCksXG5cdFx0XHRpbnN0YW5jZSA9IHNlbGYuaW5zdGFuY2UsXG5cdFx0XHRjdXJyZW50ID0gaW5zdGFuY2UuY3VycmVudCxcblx0XHRcdCRzbGlkZSA9IGN1cnJlbnQuJHNsaWRlLFxuXHRcdFx0JGNvbnRlbnQgPSBjdXJyZW50LiRjb250ZW50LFxuXHRcdFx0aXNUb3VjaERldmljZSA9IGUudHlwZSA9PSBcInRvdWNoc3RhcnRcIjtcblxuXHRcdC8vIERvIG5vdCByZXNwb25kIHRvIGJvdGggKHRvdWNoIGFuZCBtb3VzZSkgZXZlbnRzXG5cdFx0aWYgKGlzVG91Y2hEZXZpY2UpIHtcblx0XHRcdHNlbGYuJGNvbnRhaW5lci5vZmYoXCJtb3VzZWRvd24uZmIudG91Y2hcIik7XG5cdFx0fVxuXG5cdFx0Ly8gSWdub3JlIHJpZ2h0IGNsaWNrXG5cdFx0aWYgKGUub3JpZ2luYWxFdmVudCAmJiBlLm9yaWdpbmFsRXZlbnQuYnV0dG9uID09IDIpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBJZ25vcmUgdGFwaW5nIG9uIGxpbmtzLCBidXR0b25zLCBpbnB1dCBlbGVtZW50c1xuXHRcdGlmICghJHNsaWRlLmxlbmd0aCB8fCAhJHRhcmdldC5sZW5ndGggfHwgaXNDbGlja2FibGUoJHRhcmdldCkgfHwgaXNDbGlja2FibGUoJHRhcmdldC5wYXJlbnQoKSkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ly8gSWdub3JlIGNsaWNrcyBvbiB0aGUgc2Nyb2xsYmFyXG5cdFx0aWYgKCEkdGFyZ2V0LmlzKFwiaW1nXCIpICYmIGUub3JpZ2luYWxFdmVudC5jbGllbnRYID4gJHRhcmdldFswXS5jbGllbnRXaWR0aCArICR0YXJnZXQub2Zmc2V0KCkubGVmdCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIElnbm9yZSBjbGlja3Mgd2hpbGUgem9vbWluZyBvciBjbG9zaW5nXG5cdFx0aWYgKCFjdXJyZW50IHx8IGluc3RhbmNlLmlzQW5pbWF0aW5nIHx8IGN1cnJlbnQuJHNsaWRlLmhhc0NsYXNzKFwiZmFuY3lib3gtYW5pbWF0ZWRcIikpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzZWxmLnJlYWxQb2ludHMgPSBzZWxmLnN0YXJ0UG9pbnRzID0gZ2V0UG9pbnRlclhZKGUpO1xuXG5cdFx0aWYgKCFzZWxmLnN0YXJ0UG9pbnRzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIEFsbG93IG90aGVyIHNjcmlwdHMgdG8gY2F0Y2ggdG91Y2ggZXZlbnQgaWYgXCJ0b3VjaFwiIGlzIHNldCB0byBmYWxzZVxuXHRcdGlmIChjdXJyZW50LnRvdWNoKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH1cblxuXHRcdHNlbGYuc3RhcnRFdmVudCA9IGU7XG5cblx0XHRzZWxmLmNhblRhcCA9IHRydWU7XG5cdFx0c2VsZi4kdGFyZ2V0ID0gJHRhcmdldDtcblx0XHRzZWxmLiRjb250ZW50ID0gJGNvbnRlbnQ7XG5cdFx0c2VsZi5vcHRzID0gY3VycmVudC5vcHRzLnRvdWNoO1xuXG5cdFx0c2VsZi5pc1Bhbm5pbmcgPSBmYWxzZTtcblx0XHRzZWxmLmlzU3dpcGluZyA9IGZhbHNlO1xuXHRcdHNlbGYuaXNab29taW5nID0gZmFsc2U7XG5cdFx0c2VsZi5pc1Njcm9sbGluZyA9IGZhbHNlO1xuXHRcdHNlbGYuY2FuUGFuID0gaW5zdGFuY2UuY2FuUGFuKCk7XG5cblx0XHRzZWxmLnN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdHNlbGYuZGlzdGFuY2VYID0gc2VsZi5kaXN0YW5jZVkgPSBzZWxmLmRpc3RhbmNlID0gMDtcblxuXHRcdHNlbGYuY2FudmFzV2lkdGggPSBNYXRoLnJvdW5kKCRzbGlkZVswXS5jbGllbnRXaWR0aCk7XG5cdFx0c2VsZi5jYW52YXNIZWlnaHQgPSBNYXRoLnJvdW5kKCRzbGlkZVswXS5jbGllbnRIZWlnaHQpO1xuXG5cdFx0c2VsZi5jb250ZW50TGFzdFBvcyA9IG51bGw7XG5cdFx0c2VsZi5jb250ZW50U3RhcnRQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShzZWxmLiRjb250ZW50KSB8fCB7dG9wOiAwLCBsZWZ0OiAwfTtcblx0XHRzZWxmLnNsaWRlclN0YXJ0UG9zID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoJHNsaWRlKTtcblxuXHRcdC8vIFNpbmNlIHBvc2l0aW9uIHdpbGwgYmUgYWJzb2x1dGUsIGJ1dCB3ZSBuZWVkIHRvIG1ha2UgaXQgcmVsYXRpdmUgdG8gdGhlIHN0YWdlXG5cdFx0c2VsZi5zdGFnZVBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKGluc3RhbmNlLiRyZWZzLnN0YWdlKTtcblxuXHRcdHNlbGYuc2xpZGVyU3RhcnRQb3MudG9wIC09IHNlbGYuc3RhZ2VQb3MudG9wO1xuXHRcdHNlbGYuc2xpZGVyU3RhcnRQb3MubGVmdCAtPSBzZWxmLnN0YWdlUG9zLmxlZnQ7XG5cblx0XHRzZWxmLmNvbnRlbnRTdGFydFBvcy50b3AgLT0gc2VsZi5zdGFnZVBvcy50b3A7XG5cdFx0c2VsZi5jb250ZW50U3RhcnRQb3MubGVmdCAtPSBzZWxmLnN0YWdlUG9zLmxlZnQ7XG5cblx0XHQkKGRvY3VtZW50KVxuXHRcdFx0Lm9mZihcIi5mYi50b3VjaFwiKVxuXHRcdFx0Lm9uKGlzVG91Y2hEZXZpY2UgPyBcInRvdWNoZW5kLmZiLnRvdWNoIHRvdWNoY2FuY2VsLmZiLnRvdWNoXCIgOiBcIm1vdXNldXAuZmIudG91Y2ggbW91c2VsZWF2ZS5mYi50b3VjaFwiLCAkLnByb3h5KHNlbGYsIFwib250b3VjaGVuZFwiKSlcblx0XHRcdC5vbihpc1RvdWNoRGV2aWNlID8gXCJ0b3VjaG1vdmUuZmIudG91Y2hcIiA6IFwibW91c2Vtb3ZlLmZiLnRvdWNoXCIsICQucHJveHkoc2VsZiwgXCJvbnRvdWNobW92ZVwiKSk7XG5cblx0XHRpZiAoJC5mYW5jeWJveC5pc01vYmlsZSkge1xuXHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBzZWxmLm9uc2Nyb2xsLCB0cnVlKTtcblx0XHR9XG5cblx0XHQvLyBTa2lwIGlmIGNsaWNrZWQgb3V0c2lkZSB0aGUgc2xpZGluZyBhcmVhXG5cdFx0aWYgKCEoc2VsZi5vcHRzIHx8IHNlbGYuY2FuUGFuKSB8fCAhKCR0YXJnZXQuaXMoc2VsZi4kc3RhZ2UpIHx8IHNlbGYuJHN0YWdlLmZpbmQoJHRhcmdldCkubGVuZ3RoKSkge1xuXHRcdFx0aWYgKCR0YXJnZXQuaXMoXCIuZmFuY3lib3gtaW1hZ2VcIikpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoISgkLmZhbmN5Ym94LmlzTW9iaWxlICYmICR0YXJnZXQuaGFzQ2xhc3MoXCJmYW5jeWJveC1jYXB0aW9uXCIpKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0c2VsZi5pc1Njcm9sbGFibGUgPSBpc1Njcm9sbGFibGUoJHRhcmdldCkgfHwgaXNTY3JvbGxhYmxlKCR0YXJnZXQucGFyZW50KCkpO1xuXG5cdFx0Ly8gQ2hlY2sgaWYgZWxlbWVudCBpcyBzY3JvbGxhYmxlIGFuZCB0cnkgdG8gcHJldmVudCBkZWZhdWx0IGJlaGF2aW9yIChzY3JvbGxpbmcpXG5cdFx0aWYgKCEoJC5mYW5jeWJveC5pc01vYmlsZSAmJiBzZWxmLmlzU2Nyb2xsYWJsZSkpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHR9XG5cblx0XHQvLyBPbmUgZmluZ2VyIG9yIG1vdXNlIGNsaWNrIC0gc3dpcGUgb3IgcGFuIGFuIGltYWdlXG5cdFx0aWYgKHNlbGYuc3RhcnRQb2ludHMubGVuZ3RoID09PSAxIHx8IGN1cnJlbnQuaGFzRXJyb3IpIHtcblx0XHRcdGlmIChzZWxmLmNhblBhbikge1xuXHRcdFx0XHQkLmZhbmN5Ym94LnN0b3Aoc2VsZi4kY29udGVudCk7XG5cblx0XHRcdFx0c2VsZi5pc1Bhbm5pbmcgPSB0cnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5pc1N3aXBpbmcgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLiRjb250YWluZXIuYWRkQ2xhc3MoXCJmYW5jeWJveC1pcy1ncmFiYmluZ1wiKTtcblx0XHR9XG5cblx0XHQvLyBUd28gZmluZ2VycyAtIHpvb20gaW1hZ2Vcblx0XHRpZiAoc2VsZi5zdGFydFBvaW50cy5sZW5ndGggPT09IDIgJiYgY3VycmVudC50eXBlID09PSBcImltYWdlXCIgJiYgKGN1cnJlbnQuaXNMb2FkZWQgfHwgY3VycmVudC4kZ2hvc3QpKSB7XG5cdFx0XHRzZWxmLmNhblRhcCA9IGZhbHNlO1xuXHRcdFx0c2VsZi5pc1N3aXBpbmcgPSBmYWxzZTtcblx0XHRcdHNlbGYuaXNQYW5uaW5nID0gZmFsc2U7XG5cblx0XHRcdHNlbGYuaXNab29taW5nID0gdHJ1ZTtcblxuXHRcdFx0JC5mYW5jeWJveC5zdG9wKHNlbGYuJGNvbnRlbnQpO1xuXG5cdFx0XHRzZWxmLmNlbnRlclBvaW50U3RhcnRYID0gKHNlbGYuc3RhcnRQb2ludHNbMF0ueCArIHNlbGYuc3RhcnRQb2ludHNbMV0ueCkgKiAwLjUgLSAkKHdpbmRvdykuc2Nyb2xsTGVmdCgpO1xuXHRcdFx0c2VsZi5jZW50ZXJQb2ludFN0YXJ0WSA9IChzZWxmLnN0YXJ0UG9pbnRzWzBdLnkgKyBzZWxmLnN0YXJ0UG9pbnRzWzFdLnkpICogMC41IC0gJCh3aW5kb3cpLnNjcm9sbFRvcCgpO1xuXG5cdFx0XHRzZWxmLnBlcmNlbnRhZ2VPZkltYWdlQXRQaW5jaFBvaW50WCA9IChzZWxmLmNlbnRlclBvaW50U3RhcnRYIC0gc2VsZi5jb250ZW50U3RhcnRQb3MubGVmdCkgLyBzZWxmLmNvbnRlbnRTdGFydFBvcy53aWR0aDtcblx0XHRcdHNlbGYucGVyY2VudGFnZU9mSW1hZ2VBdFBpbmNoUG9pbnRZID0gKHNlbGYuY2VudGVyUG9pbnRTdGFydFkgLSBzZWxmLmNvbnRlbnRTdGFydFBvcy50b3ApIC8gc2VsZi5jb250ZW50U3RhcnRQb3MuaGVpZ2h0O1xuXG5cdFx0XHRzZWxmLnN0YXJ0RGlzdGFuY2VCZXR3ZWVuRmluZ2VycyA9IGRpc3RhbmNlKHNlbGYuc3RhcnRQb2ludHNbMF0sIHNlbGYuc3RhcnRQb2ludHNbMV0pO1xuXHRcdH1cblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9uc2Nyb2xsID0gZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuaXNTY3JvbGxpbmcgPSB0cnVlO1xuXG5cdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBzZWxmLm9uc2Nyb2xsLCB0cnVlKTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9udG91Y2htb3ZlID0gZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIE1ha2Ugc3VyZSB1c2VyIGhhcyBub3QgcmVsZWFzZWQgb3ZlciBpZnJhbWUgb3IgZGlzYWJsZWQgZWxlbWVudFxuXHRcdGlmIChlLm9yaWdpbmFsRXZlbnQuYnV0dG9ucyAhPT0gdW5kZWZpbmVkICYmIGUub3JpZ2luYWxFdmVudC5idXR0b25zID09PSAwKSB7XG5cdFx0XHRzZWxmLm9udG91Y2hlbmQoZSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHNlbGYuaXNTY3JvbGxpbmcpIHtcblx0XHRcdHNlbGYuY2FuVGFwID0gZmFsc2U7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c2VsZi5uZXdQb2ludHMgPSBnZXRQb2ludGVyWFkoZSk7XG5cblx0XHRpZiAoIShzZWxmLm9wdHMgfHwgc2VsZi5jYW5QYW4pIHx8ICFzZWxmLm5ld1BvaW50cy5sZW5ndGggfHwgIXNlbGYubmV3UG9pbnRzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICghKHNlbGYuaXNTd2lwaW5nICYmIHNlbGYuaXNTd2lwaW5nID09PSB0cnVlKSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblxuXHRcdHNlbGYuZGlzdGFuY2VYID0gZGlzdGFuY2Uoc2VsZi5uZXdQb2ludHNbMF0sIHNlbGYuc3RhcnRQb2ludHNbMF0sIFwieFwiKTtcblx0XHRzZWxmLmRpc3RhbmNlWSA9IGRpc3RhbmNlKHNlbGYubmV3UG9pbnRzWzBdLCBzZWxmLnN0YXJ0UG9pbnRzWzBdLCBcInlcIik7XG5cblx0XHRzZWxmLmRpc3RhbmNlID0gZGlzdGFuY2Uoc2VsZi5uZXdQb2ludHNbMF0sIHNlbGYuc3RhcnRQb2ludHNbMF0pO1xuXG5cdFx0Ly8gU2tpcCBmYWxzZSBvbnRvdWNobW92ZSBldmVudHMgKENocm9tZSlcblx0XHRpZiAoc2VsZi5kaXN0YW5jZSA+IDApIHtcblx0XHRcdGlmIChzZWxmLmlzU3dpcGluZykge1xuXHRcdFx0XHRzZWxmLm9uU3dpcGUoZSk7XG5cdFx0XHR9IGVsc2UgaWYgKHNlbGYuaXNQYW5uaW5nKSB7XG5cdFx0XHRcdHNlbGYub25QYW4oKTtcblx0XHRcdH0gZWxzZSBpZiAoc2VsZi5pc1pvb21pbmcpIHtcblx0XHRcdFx0c2VsZi5vblpvb20oKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vblN3aXBlID0gZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdGluc3RhbmNlID0gc2VsZi5pbnN0YW5jZSxcblx0XHRcdHN3aXBpbmcgPSBzZWxmLmlzU3dpcGluZyxcblx0XHRcdGxlZnQgPSBzZWxmLnNsaWRlclN0YXJ0UG9zLmxlZnQgfHwgMCxcblx0XHRcdGFuZ2xlO1xuXG5cdFx0Ly8gSWYgZGlyZWN0aW9uIGlzIG5vdCB5ZXQgZGV0ZXJtaW5lZFxuXHRcdGlmIChzd2lwaW5nID09PSB0cnVlKSB7XG5cdFx0XHQvLyBXZSBuZWVkIGF0IGxlYXN0IDEwcHggZGlzdGFuY2UgdG8gY29ycmVjdGx5IGNhbGN1bGF0ZSBhbiBhbmdsZVxuXHRcdFx0aWYgKE1hdGguYWJzKHNlbGYuZGlzdGFuY2UpID4gMTApIHtcblx0XHRcdFx0c2VsZi5jYW5UYXAgPSBmYWxzZTtcblxuXHRcdFx0XHRpZiAoaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIDwgMiAmJiBzZWxmLm9wdHMudmVydGljYWwpIHtcblx0XHRcdFx0XHRzZWxmLmlzU3dpcGluZyA9IFwieVwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGluc3RhbmNlLmlzRHJhZ2dpbmcgfHwgc2VsZi5vcHRzLnZlcnRpY2FsID09PSBmYWxzZSB8fCAoc2VsZi5vcHRzLnZlcnRpY2FsID09PSBcImF1dG9cIiAmJiAkKHdpbmRvdykud2lkdGgoKSA+IDgwMCkpIHtcblx0XHRcdFx0XHRzZWxmLmlzU3dpcGluZyA9IFwieFwiO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGFuZ2xlID0gTWF0aC5hYnMoKE1hdGguYXRhbjIoc2VsZi5kaXN0YW5jZVksIHNlbGYuZGlzdGFuY2VYKSAqIDE4MCkgLyBNYXRoLlBJKTtcblxuXHRcdFx0XHRcdHNlbGYuaXNTd2lwaW5nID0gYW5nbGUgPiA0NSAmJiBhbmdsZSA8IDEzNSA/IFwieVwiIDogXCJ4XCI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoc2VsZi5pc1N3aXBpbmcgPT09IFwieVwiICYmICQuZmFuY3lib3guaXNNb2JpbGUgJiYgc2VsZi5pc1Njcm9sbGFibGUpIHtcblx0XHRcdFx0XHRzZWxmLmlzU2Nyb2xsaW5nID0gdHJ1ZTtcblxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGluc3RhbmNlLmlzRHJhZ2dpbmcgPSBzZWxmLmlzU3dpcGluZztcblxuXHRcdFx0XHQvLyBSZXNldCBwb2ludHMgdG8gYXZvaWQganVtcGluZywgYmVjYXVzZSB3ZSBkcm9wcGVkIGZpcnN0IHN3aXBlcyB0byBjYWxjdWxhdGUgdGhlIGFuZ2xlXG5cdFx0XHRcdHNlbGYuc3RhcnRQb2ludHMgPSBzZWxmLm5ld1BvaW50cztcblxuXHRcdFx0XHQkLmVhY2goaW5zdGFuY2Uuc2xpZGVzLCBmdW5jdGlvbihpbmRleCwgc2xpZGUpIHtcblx0XHRcdFx0XHR2YXIgc2xpZGVQb3MsIHN0YWdlUG9zO1xuXG5cdFx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKHNsaWRlLiRzbGlkZSk7XG5cblx0XHRcdFx0XHRzbGlkZVBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKHNsaWRlLiRzbGlkZSk7XG5cdFx0XHRcdFx0c3RhZ2VQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShpbnN0YW5jZS4kcmVmcy5zdGFnZSk7XG5cblx0XHRcdFx0XHRzbGlkZS4kc2xpZGVcblx0XHRcdFx0XHRcdC5jc3Moe1xuXHRcdFx0XHRcdFx0XHR0cmFuc2Zvcm06IFwiXCIsXG5cdFx0XHRcdFx0XHRcdG9wYWNpdHk6IFwiXCIsXG5cdFx0XHRcdFx0XHRcdFwidHJhbnNpdGlvbi1kdXJhdGlvblwiOiBcIlwiXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtYW5pbWF0ZWRcIilcblx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcyhmdW5jdGlvbihpbmRleCwgY2xhc3NOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAoY2xhc3NOYW1lLm1hdGNoKC8oXnxcXHMpZmFuY3lib3gtZngtXFxTKy9nKSB8fCBbXSkuam9pbihcIiBcIik7XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdGlmIChzbGlkZS5wb3MgPT09IGluc3RhbmNlLmN1cnJlbnQucG9zKSB7XG5cdFx0XHRcdFx0XHRzZWxmLnNsaWRlclN0YXJ0UG9zLnRvcCA9IHNsaWRlUG9zLnRvcCAtIHN0YWdlUG9zLnRvcDtcblx0XHRcdFx0XHRcdHNlbGYuc2xpZGVyU3RhcnRQb3MubGVmdCA9IHNsaWRlUG9zLmxlZnQgLSBzdGFnZVBvcy5sZWZ0O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQuZmFuY3lib3guc2V0VHJhbnNsYXRlKHNsaWRlLiRzbGlkZSwge1xuXHRcdFx0XHRcdFx0dG9wOiBzbGlkZVBvcy50b3AgLSBzdGFnZVBvcy50b3AsXG5cdFx0XHRcdFx0XHRsZWZ0OiBzbGlkZVBvcy5sZWZ0IC0gc3RhZ2VQb3MubGVmdFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQvLyBTdG9wIHNsaWRlc2hvd1xuXHRcdFx0XHRpZiAoaW5zdGFuY2UuU2xpZGVTaG93ICYmIGluc3RhbmNlLlNsaWRlU2hvdy5pc0FjdGl2ZSkge1xuXHRcdFx0XHRcdGluc3RhbmNlLlNsaWRlU2hvdy5zdG9wKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFN0aWNreSBlZGdlc1xuXHRcdGlmIChzd2lwaW5nID09IFwieFwiKSB7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdHNlbGYuZGlzdGFuY2VYID4gMCAmJlxuXHRcdFx0XHQoc2VsZi5pbnN0YW5jZS5ncm91cC5sZW5ndGggPCAyIHx8IChzZWxmLmluc3RhbmNlLmN1cnJlbnQuaW5kZXggPT09IDAgJiYgIXNlbGYuaW5zdGFuY2UuY3VycmVudC5vcHRzLmxvb3ApKVxuXHRcdFx0KSB7XG5cdFx0XHRcdGxlZnQgPSBsZWZ0ICsgTWF0aC5wb3coc2VsZi5kaXN0YW5jZVgsIDAuOCk7XG5cdFx0XHR9IGVsc2UgaWYgKFxuXHRcdFx0XHRzZWxmLmRpc3RhbmNlWCA8IDAgJiZcblx0XHRcdFx0KHNlbGYuaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIDwgMiB8fFxuXHRcdFx0XHRcdChzZWxmLmluc3RhbmNlLmN1cnJlbnQuaW5kZXggPT09IHNlbGYuaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIC0gMSAmJiAhc2VsZi5pbnN0YW5jZS5jdXJyZW50Lm9wdHMubG9vcCkpXG5cdFx0XHQpIHtcblx0XHRcdFx0bGVmdCA9IGxlZnQgLSBNYXRoLnBvdygtc2VsZi5kaXN0YW5jZVgsIDAuOCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsZWZ0ID0gbGVmdCArIHNlbGYuZGlzdGFuY2VYO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHNlbGYuc2xpZGVyTGFzdFBvcyA9IHtcblx0XHRcdHRvcDogc3dpcGluZyA9PSBcInhcIiA/IDAgOiBzZWxmLnNsaWRlclN0YXJ0UG9zLnRvcCArIHNlbGYuZGlzdGFuY2VZLFxuXHRcdFx0bGVmdDogbGVmdFxuXHRcdH07XG5cblx0XHRpZiAoc2VsZi5yZXF1ZXN0SWQpIHtcblx0XHRcdGNhbmNlbEFGcmFtZShzZWxmLnJlcXVlc3RJZCk7XG5cblx0XHRcdHNlbGYucmVxdWVzdElkID0gbnVsbDtcblx0XHR9XG5cblx0XHRzZWxmLnJlcXVlc3RJZCA9IHJlcXVlc3RBRnJhbWUoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoc2VsZi5zbGlkZXJMYXN0UG9zKSB7XG5cdFx0XHRcdCQuZWFjaChzZWxmLmluc3RhbmNlLnNsaWRlcywgZnVuY3Rpb24oaW5kZXgsIHNsaWRlKSB7XG5cdFx0XHRcdFx0dmFyIHBvcyA9IHNsaWRlLnBvcyAtIHNlbGYuaW5zdGFuY2UuY3VyclBvcztcblxuXHRcdFx0XHRcdCQuZmFuY3lib3guc2V0VHJhbnNsYXRlKHNsaWRlLiRzbGlkZSwge1xuXHRcdFx0XHRcdFx0dG9wOiBzZWxmLnNsaWRlckxhc3RQb3MudG9wLFxuXHRcdFx0XHRcdFx0bGVmdDogc2VsZi5zbGlkZXJMYXN0UG9zLmxlZnQgKyBwb3MgKiBzZWxmLmNhbnZhc1dpZHRoICsgcG9zICogc2xpZGUub3B0cy5ndXR0ZXJcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c2VsZi4kY29udGFpbmVyLmFkZENsYXNzKFwiZmFuY3lib3gtaXMtc2xpZGluZ1wiKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9uUGFuID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0Ly8gUHJldmVudCBhY2NpZGVudGFsIG1vdmVtZW50IChzb21ldGltZXMsIHdoZW4gdGFwcGluZyBjYXN1YWxseSwgZmluZ2VyIGNhbiBtb3ZlIGEgYml0KVxuXHRcdGlmIChkaXN0YW5jZShzZWxmLm5ld1BvaW50c1swXSwgc2VsZi5yZWFsUG9pbnRzWzBdKSA8ICgkLmZhbmN5Ym94LmlzTW9iaWxlID8gMTAgOiA1KSkge1xuXHRcdFx0c2VsZi5zdGFydFBvaW50cyA9IHNlbGYubmV3UG9pbnRzO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHNlbGYuY2FuVGFwID0gZmFsc2U7XG5cblx0XHRzZWxmLmNvbnRlbnRMYXN0UG9zID0gc2VsZi5saW1pdE1vdmVtZW50KCk7XG5cblx0XHRpZiAoc2VsZi5yZXF1ZXN0SWQpIHtcblx0XHRcdGNhbmNlbEFGcmFtZShzZWxmLnJlcXVlc3RJZCk7XG5cdFx0fVxuXG5cdFx0c2VsZi5yZXF1ZXN0SWQgPSByZXF1ZXN0QUZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdFx0JC5mYW5jeWJveC5zZXRUcmFuc2xhdGUoc2VsZi4kY29udGVudCwgc2VsZi5jb250ZW50TGFzdFBvcyk7XG5cdFx0fSk7XG5cdH07XG5cblx0Ly8gTWFrZSBwYW5uaW5nIHN0aWNreSB0byB0aGUgZWRnZXNcblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5saW1pdE1vdmVtZW50ID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dmFyIGNhbnZhc1dpZHRoID0gc2VsZi5jYW52YXNXaWR0aDtcblx0XHR2YXIgY2FudmFzSGVpZ2h0ID0gc2VsZi5jYW52YXNIZWlnaHQ7XG5cblx0XHR2YXIgZGlzdGFuY2VYID0gc2VsZi5kaXN0YW5jZVg7XG5cdFx0dmFyIGRpc3RhbmNlWSA9IHNlbGYuZGlzdGFuY2VZO1xuXG5cdFx0dmFyIGNvbnRlbnRTdGFydFBvcyA9IHNlbGYuY29udGVudFN0YXJ0UG9zO1xuXG5cdFx0dmFyIGN1cnJlbnRPZmZzZXRYID0gY29udGVudFN0YXJ0UG9zLmxlZnQ7XG5cdFx0dmFyIGN1cnJlbnRPZmZzZXRZID0gY29udGVudFN0YXJ0UG9zLnRvcDtcblxuXHRcdHZhciBjdXJyZW50V2lkdGggPSBjb250ZW50U3RhcnRQb3Mud2lkdGg7XG5cdFx0dmFyIGN1cnJlbnRIZWlnaHQgPSBjb250ZW50U3RhcnRQb3MuaGVpZ2h0O1xuXG5cdFx0dmFyIG1pblRyYW5zbGF0ZVgsIG1pblRyYW5zbGF0ZVksIG1heFRyYW5zbGF0ZVgsIG1heFRyYW5zbGF0ZVksIG5ld09mZnNldFgsIG5ld09mZnNldFk7XG5cblx0XHRpZiAoY3VycmVudFdpZHRoID4gY2FudmFzV2lkdGgpIHtcblx0XHRcdG5ld09mZnNldFggPSBjdXJyZW50T2Zmc2V0WCArIGRpc3RhbmNlWDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bmV3T2Zmc2V0WCA9IGN1cnJlbnRPZmZzZXRYO1xuXHRcdH1cblxuXHRcdG5ld09mZnNldFkgPSBjdXJyZW50T2Zmc2V0WSArIGRpc3RhbmNlWTtcblxuXHRcdC8vIFNsb3cgZG93biBwcm9wb3J0aW9uYWxseSB0byB0cmF2ZWxlZCBkaXN0YW5jZVxuXHRcdG1pblRyYW5zbGF0ZVggPSBNYXRoLm1heCgwLCBjYW52YXNXaWR0aCAqIDAuNSAtIGN1cnJlbnRXaWR0aCAqIDAuNSk7XG5cdFx0bWluVHJhbnNsYXRlWSA9IE1hdGgubWF4KDAsIGNhbnZhc0hlaWdodCAqIDAuNSAtIGN1cnJlbnRIZWlnaHQgKiAwLjUpO1xuXG5cdFx0bWF4VHJhbnNsYXRlWCA9IE1hdGgubWluKGNhbnZhc1dpZHRoIC0gY3VycmVudFdpZHRoLCBjYW52YXNXaWR0aCAqIDAuNSAtIGN1cnJlbnRXaWR0aCAqIDAuNSk7XG5cdFx0bWF4VHJhbnNsYXRlWSA9IE1hdGgubWluKGNhbnZhc0hlaWdodCAtIGN1cnJlbnRIZWlnaHQsIGNhbnZhc0hlaWdodCAqIDAuNSAtIGN1cnJlbnRIZWlnaHQgKiAwLjUpO1xuXG5cdFx0Ly8gICAtPlxuXHRcdGlmIChkaXN0YW5jZVggPiAwICYmIG5ld09mZnNldFggPiBtaW5UcmFuc2xhdGVYKSB7XG5cdFx0XHRuZXdPZmZzZXRYID0gbWluVHJhbnNsYXRlWCAtIDEgKyBNYXRoLnBvdygtbWluVHJhbnNsYXRlWCArIGN1cnJlbnRPZmZzZXRYICsgZGlzdGFuY2VYLCAwLjgpIHx8IDA7XG5cdFx0fVxuXG5cdFx0Ly8gICAgPC1cblx0XHRpZiAoZGlzdGFuY2VYIDwgMCAmJiBuZXdPZmZzZXRYIDwgbWF4VHJhbnNsYXRlWCkge1xuXHRcdFx0bmV3T2Zmc2V0WCA9IG1heFRyYW5zbGF0ZVggKyAxIC0gTWF0aC5wb3cobWF4VHJhbnNsYXRlWCAtIGN1cnJlbnRPZmZzZXRYIC0gZGlzdGFuY2VYLCAwLjgpIHx8IDA7XG5cdFx0fVxuXG5cdFx0Ly8gICBcXC9cblx0XHRpZiAoZGlzdGFuY2VZID4gMCAmJiBuZXdPZmZzZXRZID4gbWluVHJhbnNsYXRlWSkge1xuXHRcdFx0bmV3T2Zmc2V0WSA9IG1pblRyYW5zbGF0ZVkgLSAxICsgTWF0aC5wb3coLW1pblRyYW5zbGF0ZVkgKyBjdXJyZW50T2Zmc2V0WSArIGRpc3RhbmNlWSwgMC44KSB8fCAwO1xuXHRcdH1cblxuXHRcdC8vICAgL1xcXG5cdFx0aWYgKGRpc3RhbmNlWSA8IDAgJiYgbmV3T2Zmc2V0WSA8IG1heFRyYW5zbGF0ZVkpIHtcblx0XHRcdG5ld09mZnNldFkgPSBtYXhUcmFuc2xhdGVZICsgMSAtIE1hdGgucG93KG1heFRyYW5zbGF0ZVkgLSBjdXJyZW50T2Zmc2V0WSAtIGRpc3RhbmNlWSwgMC44KSB8fCAwO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHR0b3A6IG5ld09mZnNldFksXG5cdFx0XHRsZWZ0OiBuZXdPZmZzZXRYXG5cdFx0fTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLmxpbWl0UG9zaXRpb24gPSBmdW5jdGlvbihuZXdPZmZzZXRYLCBuZXdPZmZzZXRZLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dmFyIGNhbnZhc1dpZHRoID0gc2VsZi5jYW52YXNXaWR0aDtcblx0XHR2YXIgY2FudmFzSGVpZ2h0ID0gc2VsZi5jYW52YXNIZWlnaHQ7XG5cblx0XHRpZiAobmV3V2lkdGggPiBjYW52YXNXaWR0aCkge1xuXHRcdFx0bmV3T2Zmc2V0WCA9IG5ld09mZnNldFggPiAwID8gMCA6IG5ld09mZnNldFg7XG5cdFx0XHRuZXdPZmZzZXRYID0gbmV3T2Zmc2V0WCA8IGNhbnZhc1dpZHRoIC0gbmV3V2lkdGggPyBjYW52YXNXaWR0aCAtIG5ld1dpZHRoIDogbmV3T2Zmc2V0WDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gQ2VudGVyIGhvcml6b250YWxseVxuXHRcdFx0bmV3T2Zmc2V0WCA9IE1hdGgubWF4KDAsIGNhbnZhc1dpZHRoIC8gMiAtIG5ld1dpZHRoIC8gMik7XG5cdFx0fVxuXG5cdFx0aWYgKG5ld0hlaWdodCA+IGNhbnZhc0hlaWdodCkge1xuXHRcdFx0bmV3T2Zmc2V0WSA9IG5ld09mZnNldFkgPiAwID8gMCA6IG5ld09mZnNldFk7XG5cdFx0XHRuZXdPZmZzZXRZID0gbmV3T2Zmc2V0WSA8IGNhbnZhc0hlaWdodCAtIG5ld0hlaWdodCA/IGNhbnZhc0hlaWdodCAtIG5ld0hlaWdodCA6IG5ld09mZnNldFk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIENlbnRlciB2ZXJ0aWNhbGx5XG5cdFx0XHRuZXdPZmZzZXRZID0gTWF0aC5tYXgoMCwgY2FudmFzSGVpZ2h0IC8gMiAtIG5ld0hlaWdodCAvIDIpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHR0b3A6IG5ld09mZnNldFksXG5cdFx0XHRsZWZ0OiBuZXdPZmZzZXRYXG5cdFx0fTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9uWm9vbSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIENhbGN1bGF0ZSBjdXJyZW50IGRpc3RhbmNlIGJldHdlZW4gcG9pbnRzIHRvIGdldCBwaW5jaCByYXRpbyBhbmQgbmV3IHdpZHRoIGFuZCBoZWlnaHRcblx0XHR2YXIgY29udGVudFN0YXJ0UG9zID0gc2VsZi5jb250ZW50U3RhcnRQb3M7XG5cblx0XHR2YXIgY3VycmVudFdpZHRoID0gY29udGVudFN0YXJ0UG9zLndpZHRoO1xuXHRcdHZhciBjdXJyZW50SGVpZ2h0ID0gY29udGVudFN0YXJ0UG9zLmhlaWdodDtcblxuXHRcdHZhciBjdXJyZW50T2Zmc2V0WCA9IGNvbnRlbnRTdGFydFBvcy5sZWZ0O1xuXHRcdHZhciBjdXJyZW50T2Zmc2V0WSA9IGNvbnRlbnRTdGFydFBvcy50b3A7XG5cblx0XHR2YXIgZW5kRGlzdGFuY2VCZXR3ZWVuRmluZ2VycyA9IGRpc3RhbmNlKHNlbGYubmV3UG9pbnRzWzBdLCBzZWxmLm5ld1BvaW50c1sxXSk7XG5cblx0XHR2YXIgcGluY2hSYXRpbyA9IGVuZERpc3RhbmNlQmV0d2VlbkZpbmdlcnMgLyBzZWxmLnN0YXJ0RGlzdGFuY2VCZXR3ZWVuRmluZ2VycztcblxuXHRcdHZhciBuZXdXaWR0aCA9IE1hdGguZmxvb3IoY3VycmVudFdpZHRoICogcGluY2hSYXRpbyk7XG5cdFx0dmFyIG5ld0hlaWdodCA9IE1hdGguZmxvb3IoY3VycmVudEhlaWdodCAqIHBpbmNoUmF0aW8pO1xuXG5cdFx0Ly8gVGhpcyBpcyB0aGUgdHJhbnNsYXRpb24gZHVlIHRvIHBpbmNoLXpvb21pbmdcblx0XHR2YXIgdHJhbnNsYXRlRnJvbVpvb21pbmdYID0gKGN1cnJlbnRXaWR0aCAtIG5ld1dpZHRoKSAqIHNlbGYucGVyY2VudGFnZU9mSW1hZ2VBdFBpbmNoUG9pbnRYO1xuXHRcdHZhciB0cmFuc2xhdGVGcm9tWm9vbWluZ1kgPSAoY3VycmVudEhlaWdodCAtIG5ld0hlaWdodCkgKiBzZWxmLnBlcmNlbnRhZ2VPZkltYWdlQXRQaW5jaFBvaW50WTtcblxuXHRcdC8vIFBvaW50IGJldHdlZW4gdGhlIHR3byB0b3VjaGVzXG5cdFx0dmFyIGNlbnRlclBvaW50RW5kWCA9IChzZWxmLm5ld1BvaW50c1swXS54ICsgc2VsZi5uZXdQb2ludHNbMV0ueCkgLyAyIC0gJCh3aW5kb3cpLnNjcm9sbExlZnQoKTtcblx0XHR2YXIgY2VudGVyUG9pbnRFbmRZID0gKHNlbGYubmV3UG9pbnRzWzBdLnkgKyBzZWxmLm5ld1BvaW50c1sxXS55KSAvIDIgLSAkKHdpbmRvdykuc2Nyb2xsVG9wKCk7XG5cblx0XHQvLyBBbmQgdGhpcyBpcyB0aGUgdHJhbnNsYXRpb24gZHVlIHRvIHRyYW5zbGF0aW9uIG9mIHRoZSBjZW50ZXJwb2ludFxuXHRcdC8vIGJldHdlZW4gdGhlIHR3byBmaW5nZXJzXG5cdFx0dmFyIHRyYW5zbGF0ZUZyb21UcmFuc2xhdGluZ1ggPSBjZW50ZXJQb2ludEVuZFggLSBzZWxmLmNlbnRlclBvaW50U3RhcnRYO1xuXHRcdHZhciB0cmFuc2xhdGVGcm9tVHJhbnNsYXRpbmdZID0gY2VudGVyUG9pbnRFbmRZIC0gc2VsZi5jZW50ZXJQb2ludFN0YXJ0WTtcblxuXHRcdC8vIFRoZSBuZXcgb2Zmc2V0IGlzIHRoZSBvbGQvY3VycmVudCBvbmUgcGx1cyB0aGUgdG90YWwgdHJhbnNsYXRpb25cblx0XHR2YXIgbmV3T2Zmc2V0WCA9IGN1cnJlbnRPZmZzZXRYICsgKHRyYW5zbGF0ZUZyb21ab29taW5nWCArIHRyYW5zbGF0ZUZyb21UcmFuc2xhdGluZ1gpO1xuXHRcdHZhciBuZXdPZmZzZXRZID0gY3VycmVudE9mZnNldFkgKyAodHJhbnNsYXRlRnJvbVpvb21pbmdZICsgdHJhbnNsYXRlRnJvbVRyYW5zbGF0aW5nWSk7XG5cblx0XHR2YXIgbmV3UG9zID0ge1xuXHRcdFx0dG9wOiBuZXdPZmZzZXRZLFxuXHRcdFx0bGVmdDogbmV3T2Zmc2V0WCxcblx0XHRcdHNjYWxlWDogcGluY2hSYXRpbyxcblx0XHRcdHNjYWxlWTogcGluY2hSYXRpb1xuXHRcdH07XG5cblx0XHRzZWxmLmNhblRhcCA9IGZhbHNlO1xuXG5cdFx0c2VsZi5uZXdXaWR0aCA9IG5ld1dpZHRoO1xuXHRcdHNlbGYubmV3SGVpZ2h0ID0gbmV3SGVpZ2h0O1xuXG5cdFx0c2VsZi5jb250ZW50TGFzdFBvcyA9IG5ld1BvcztcblxuXHRcdGlmIChzZWxmLnJlcXVlc3RJZCkge1xuXHRcdFx0Y2FuY2VsQUZyYW1lKHNlbGYucmVxdWVzdElkKTtcblx0XHR9XG5cblx0XHRzZWxmLnJlcXVlc3RJZCA9IHJlcXVlc3RBRnJhbWUoZnVuY3Rpb24oKSB7XG5cdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZShzZWxmLiRjb250ZW50LCBzZWxmLmNvbnRlbnRMYXN0UG9zKTtcblx0XHR9KTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9udG91Y2hlbmQgPSBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dmFyIHN3aXBpbmcgPSBzZWxmLmlzU3dpcGluZztcblx0XHR2YXIgcGFubmluZyA9IHNlbGYuaXNQYW5uaW5nO1xuXHRcdHZhciB6b29taW5nID0gc2VsZi5pc1pvb21pbmc7XG5cdFx0dmFyIHNjcm9sbGluZyA9IHNlbGYuaXNTY3JvbGxpbmc7XG5cblx0XHRzZWxmLmVuZFBvaW50cyA9IGdldFBvaW50ZXJYWShlKTtcblx0XHRzZWxmLmRNcyA9IE1hdGgubWF4KG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5zdGFydFRpbWUsIDEpO1xuXG5cdFx0c2VsZi4kY29udGFpbmVyLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtZ3JhYmJpbmdcIik7XG5cblx0XHQkKGRvY3VtZW50KS5vZmYoXCIuZmIudG91Y2hcIik7XG5cblx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIHNlbGYub25zY3JvbGwsIHRydWUpO1xuXG5cdFx0aWYgKHNlbGYucmVxdWVzdElkKSB7XG5cdFx0XHRjYW5jZWxBRnJhbWUoc2VsZi5yZXF1ZXN0SWQpO1xuXG5cdFx0XHRzZWxmLnJlcXVlc3RJZCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0c2VsZi5pc1N3aXBpbmcgPSBmYWxzZTtcblx0XHRzZWxmLmlzUGFubmluZyA9IGZhbHNlO1xuXHRcdHNlbGYuaXNab29taW5nID0gZmFsc2U7XG5cdFx0c2VsZi5pc1Njcm9sbGluZyA9IGZhbHNlO1xuXG5cdFx0c2VsZi5pbnN0YW5jZS5pc0RyYWdnaW5nID0gZmFsc2U7XG5cblx0XHRpZiAoc2VsZi5jYW5UYXApIHtcblx0XHRcdHJldHVybiBzZWxmLm9uVGFwKGUpO1xuXHRcdH1cblxuXHRcdHNlbGYuc3BlZWQgPSAxMDA7XG5cblx0XHQvLyBTcGVlZCBpbiBweC9tc1xuXHRcdHNlbGYudmVsb2NpdHlYID0gKHNlbGYuZGlzdGFuY2VYIC8gc2VsZi5kTXMpICogMC41O1xuXHRcdHNlbGYudmVsb2NpdHlZID0gKHNlbGYuZGlzdGFuY2VZIC8gc2VsZi5kTXMpICogMC41O1xuXG5cdFx0aWYgKHBhbm5pbmcpIHtcblx0XHRcdHNlbGYuZW5kUGFubmluZygpO1xuXHRcdH0gZWxzZSBpZiAoem9vbWluZykge1xuXHRcdFx0c2VsZi5lbmRab29taW5nKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlbGYuZW5kU3dpcGluZyhzd2lwaW5nLCBzY3JvbGxpbmcpO1xuXHRcdH1cblxuXHRcdHJldHVybjtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLmVuZFN3aXBpbmcgPSBmdW5jdGlvbihzd2lwaW5nLCBzY3JvbGxpbmcpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRyZXQgPSBmYWxzZSxcblx0XHRcdGxlbiA9IHNlbGYuaW5zdGFuY2UuZ3JvdXAubGVuZ3RoLFxuXHRcdFx0ZGlzdGFuY2VYID0gTWF0aC5hYnMoc2VsZi5kaXN0YW5jZVgpLFxuXHRcdFx0Y2FuQWR2YW5jZSA9IHN3aXBpbmcgPT0gXCJ4XCIgJiYgbGVuID4gMSAmJiAoKHNlbGYuZE1zID4gMTMwICYmIGRpc3RhbmNlWCA+IDEwKSB8fCBkaXN0YW5jZVggPiA1MCksXG5cdFx0XHRzcGVlZFggPSAzMDA7XG5cblx0XHRzZWxmLnNsaWRlckxhc3RQb3MgPSBudWxsO1xuXG5cdFx0Ly8gQ2xvc2UgaWYgc3dpcGVkIHZlcnRpY2FsbHkgLyBuYXZpZ2F0ZSBpZiBob3Jpem9udGFsbHlcblx0XHRpZiAoc3dpcGluZyA9PSBcInlcIiAmJiAhc2Nyb2xsaW5nICYmIE1hdGguYWJzKHNlbGYuZGlzdGFuY2VZKSA+IDUwKSB7XG5cdFx0XHQvLyBDb250aW51ZSB2ZXJ0aWNhbCBtb3ZlbWVudFxuXHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKFxuXHRcdFx0XHRzZWxmLmluc3RhbmNlLmN1cnJlbnQuJHNsaWRlLFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dG9wOiBzZWxmLnNsaWRlclN0YXJ0UG9zLnRvcCArIHNlbGYuZGlzdGFuY2VZICsgc2VsZi52ZWxvY2l0eVkgKiAxNTAsXG5cdFx0XHRcdFx0b3BhY2l0eTogMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHQyMDBcblx0XHRcdCk7XG5cdFx0XHRyZXQgPSBzZWxmLmluc3RhbmNlLmNsb3NlKHRydWUsIDI1MCk7XG5cdFx0fSBlbHNlIGlmIChjYW5BZHZhbmNlICYmIHNlbGYuZGlzdGFuY2VYID4gMCkge1xuXHRcdFx0cmV0ID0gc2VsZi5pbnN0YW5jZS5wcmV2aW91cyhzcGVlZFgpO1xuXHRcdH0gZWxzZSBpZiAoY2FuQWR2YW5jZSAmJiBzZWxmLmRpc3RhbmNlWCA8IDApIHtcblx0XHRcdHJldCA9IHNlbGYuaW5zdGFuY2UubmV4dChzcGVlZFgpO1xuXHRcdH1cblxuXHRcdGlmIChyZXQgPT09IGZhbHNlICYmIChzd2lwaW5nID09IFwieFwiIHx8IHN3aXBpbmcgPT0gXCJ5XCIpKSB7XG5cdFx0XHRzZWxmLmluc3RhbmNlLmNlbnRlclNsaWRlKDIwMCk7XG5cdFx0fVxuXG5cdFx0c2VsZi4kY29udGFpbmVyLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtc2xpZGluZ1wiKTtcblx0fTtcblxuXHQvLyBMaW1pdCBwYW5uaW5nIGZyb20gZWRnZXNcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09XG5cdEd1ZXN0dXJlcy5wcm90b3R5cGUuZW5kUGFubmluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdG5ld09mZnNldFgsXG5cdFx0XHRuZXdPZmZzZXRZLFxuXHRcdFx0bmV3UG9zO1xuXG5cdFx0aWYgKCFzZWxmLmNvbnRlbnRMYXN0UG9zKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHNlbGYub3B0cy5tb21lbnR1bSA9PT0gZmFsc2UgfHwgc2VsZi5kTXMgPiAzNTApIHtcblx0XHRcdG5ld09mZnNldFggPSBzZWxmLmNvbnRlbnRMYXN0UG9zLmxlZnQ7XG5cdFx0XHRuZXdPZmZzZXRZID0gc2VsZi5jb250ZW50TGFzdFBvcy50b3A7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIENvbnRpbnVlIG1vdmVtZW50XG5cdFx0XHRuZXdPZmZzZXRYID0gc2VsZi5jb250ZW50TGFzdFBvcy5sZWZ0ICsgc2VsZi52ZWxvY2l0eVggKiA1MDA7XG5cdFx0XHRuZXdPZmZzZXRZID0gc2VsZi5jb250ZW50TGFzdFBvcy50b3AgKyBzZWxmLnZlbG9jaXR5WSAqIDUwMDtcblx0XHR9XG5cblx0XHRuZXdQb3MgPSBzZWxmLmxpbWl0UG9zaXRpb24obmV3T2Zmc2V0WCwgbmV3T2Zmc2V0WSwgc2VsZi5jb250ZW50U3RhcnRQb3Mud2lkdGgsIHNlbGYuY29udGVudFN0YXJ0UG9zLmhlaWdodCk7XG5cblx0XHRuZXdQb3Mud2lkdGggPSBzZWxmLmNvbnRlbnRTdGFydFBvcy53aWR0aDtcblx0XHRuZXdQb3MuaGVpZ2h0ID0gc2VsZi5jb250ZW50U3RhcnRQb3MuaGVpZ2h0O1xuXG5cdFx0JC5mYW5jeWJveC5hbmltYXRlKHNlbGYuJGNvbnRlbnQsIG5ld1BvcywgMzMwKTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLmVuZFpvb21pbmcgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHR2YXIgY3VycmVudCA9IHNlbGYuaW5zdGFuY2UuY3VycmVudDtcblxuXHRcdHZhciBuZXdPZmZzZXRYLCBuZXdPZmZzZXRZLCBuZXdQb3MsIHJlc2V0O1xuXG5cdFx0dmFyIG5ld1dpZHRoID0gc2VsZi5uZXdXaWR0aDtcblx0XHR2YXIgbmV3SGVpZ2h0ID0gc2VsZi5uZXdIZWlnaHQ7XG5cblx0XHRpZiAoIXNlbGYuY29udGVudExhc3RQb3MpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRuZXdPZmZzZXRYID0gc2VsZi5jb250ZW50TGFzdFBvcy5sZWZ0O1xuXHRcdG5ld09mZnNldFkgPSBzZWxmLmNvbnRlbnRMYXN0UG9zLnRvcDtcblxuXHRcdHJlc2V0ID0ge1xuXHRcdFx0dG9wOiBuZXdPZmZzZXRZLFxuXHRcdFx0bGVmdDogbmV3T2Zmc2V0WCxcblx0XHRcdHdpZHRoOiBuZXdXaWR0aCxcblx0XHRcdGhlaWdodDogbmV3SGVpZ2h0LFxuXHRcdFx0c2NhbGVYOiAxLFxuXHRcdFx0c2NhbGVZOiAxXG5cdFx0fTtcblxuXHRcdC8vIFJlc2V0IHNjYWxleC9zY2FsZVkgdmFsdWVzOyB0aGlzIGhlbHBzIGZvciBwZXJmb21hbmNlIGFuZCBkb2VzIG5vdCBicmVhayBhbmltYXRpb25cblx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZShzZWxmLiRjb250ZW50LCByZXNldCk7XG5cblx0XHRpZiAobmV3V2lkdGggPCBzZWxmLmNhbnZhc1dpZHRoICYmIG5ld0hlaWdodCA8IHNlbGYuY2FudmFzSGVpZ2h0KSB7XG5cdFx0XHRzZWxmLmluc3RhbmNlLnNjYWxlVG9GaXQoMTUwKTtcblx0XHR9IGVsc2UgaWYgKG5ld1dpZHRoID4gY3VycmVudC53aWR0aCB8fCBuZXdIZWlnaHQgPiBjdXJyZW50LmhlaWdodCkge1xuXHRcdFx0c2VsZi5pbnN0YW5jZS5zY2FsZVRvQWN0dWFsKHNlbGYuY2VudGVyUG9pbnRTdGFydFgsIHNlbGYuY2VudGVyUG9pbnRTdGFydFksIDE1MCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG5ld1BvcyA9IHNlbGYubGltaXRQb3NpdGlvbihuZXdPZmZzZXRYLCBuZXdPZmZzZXRZLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KTtcblxuXHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKHNlbGYuJGNvbnRlbnQsIG5ld1BvcywgMTUwKTtcblx0XHR9XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vblRhcCA9IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyICR0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblxuXHRcdHZhciBpbnN0YW5jZSA9IHNlbGYuaW5zdGFuY2U7XG5cdFx0dmFyIGN1cnJlbnQgPSBpbnN0YW5jZS5jdXJyZW50O1xuXG5cdFx0dmFyIGVuZFBvaW50cyA9IChlICYmIGdldFBvaW50ZXJYWShlKSkgfHwgc2VsZi5zdGFydFBvaW50cztcblxuXHRcdHZhciB0YXBYID0gZW5kUG9pbnRzWzBdID8gZW5kUG9pbnRzWzBdLnggLSAkKHdpbmRvdykuc2Nyb2xsTGVmdCgpIC0gc2VsZi5zdGFnZVBvcy5sZWZ0IDogMDtcblx0XHR2YXIgdGFwWSA9IGVuZFBvaW50c1swXSA/IGVuZFBvaW50c1swXS55IC0gJCh3aW5kb3cpLnNjcm9sbFRvcCgpIC0gc2VsZi5zdGFnZVBvcy50b3AgOiAwO1xuXG5cdFx0dmFyIHdoZXJlO1xuXG5cdFx0dmFyIHByb2Nlc3MgPSBmdW5jdGlvbihwcmVmaXgpIHtcblx0XHRcdHZhciBhY3Rpb24gPSBjdXJyZW50Lm9wdHNbcHJlZml4XTtcblxuXHRcdFx0aWYgKCQuaXNGdW5jdGlvbihhY3Rpb24pKSB7XG5cdFx0XHRcdGFjdGlvbiA9IGFjdGlvbi5hcHBseShpbnN0YW5jZSwgW2N1cnJlbnQsIGVdKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFhY3Rpb24pIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0XHRjYXNlIFwiY2xvc2VcIjpcblx0XHRcdFx0XHRpbnN0YW5jZS5jbG9zZShzZWxmLnN0YXJ0RXZlbnQpO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcInRvZ2dsZUNvbnRyb2xzXCI6XG5cdFx0XHRcdFx0aW5zdGFuY2UudG9nZ2xlQ29udHJvbHMoKTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2UgXCJuZXh0XCI6XG5cdFx0XHRcdFx0aW5zdGFuY2UubmV4dCgpO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcIm5leHRPckNsb3NlXCI6XG5cdFx0XHRcdFx0aWYgKGluc3RhbmNlLmdyb3VwLmxlbmd0aCA+IDEpIHtcblx0XHRcdFx0XHRcdGluc3RhbmNlLm5leHQoKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aW5zdGFuY2UuY2xvc2Uoc2VsZi5zdGFydEV2ZW50KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlIFwiem9vbVwiOlxuXHRcdFx0XHRcdGlmIChjdXJyZW50LnR5cGUgPT0gXCJpbWFnZVwiICYmIChjdXJyZW50LmlzTG9hZGVkIHx8IGN1cnJlbnQuJGdob3N0KSkge1xuXHRcdFx0XHRcdFx0aWYgKGluc3RhbmNlLmNhblBhbigpKSB7XG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLnNjYWxlVG9GaXQoKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoaW5zdGFuY2UuaXNTY2FsZWREb3duKCkpIHtcblx0XHRcdFx0XHRcdFx0aW5zdGFuY2Uuc2NhbGVUb0FjdHVhbCh0YXBYLCB0YXBZKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIDwgMikge1xuXHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5jbG9zZShzZWxmLnN0YXJ0RXZlbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvLyBJZ25vcmUgcmlnaHQgY2xpY2tcblx0XHRpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5idXR0b24gPT0gMikge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFNraXAgaWYgY2xpY2tlZCBvbiB0aGUgc2Nyb2xsYmFyXG5cdFx0aWYgKCEkdGFyZ2V0LmlzKFwiaW1nXCIpICYmIHRhcFggPiAkdGFyZ2V0WzBdLmNsaWVudFdpZHRoICsgJHRhcmdldC5vZmZzZXQoKS5sZWZ0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgd2hlcmUgaXMgY2xpY2tlZFxuXHRcdGlmICgkdGFyZ2V0LmlzKFwiLmZhbmN5Ym94LWJnLC5mYW5jeWJveC1pbm5lciwuZmFuY3lib3gtb3V0ZXIsLmZhbmN5Ym94LWNvbnRhaW5lclwiKSkge1xuXHRcdFx0d2hlcmUgPSBcIk91dHNpZGVcIjtcblx0XHR9IGVsc2UgaWYgKCR0YXJnZXQuaXMoXCIuZmFuY3lib3gtc2xpZGVcIikpIHtcblx0XHRcdHdoZXJlID0gXCJTbGlkZVwiO1xuXHRcdH0gZWxzZSBpZiAoXG5cdFx0XHRpbnN0YW5jZS5jdXJyZW50LiRjb250ZW50ICYmXG5cdFx0XHRpbnN0YW5jZS5jdXJyZW50LiRjb250ZW50XG5cdFx0XHRcdC5maW5kKCR0YXJnZXQpXG5cdFx0XHRcdC5hZGRCYWNrKClcblx0XHRcdFx0LmZpbHRlcigkdGFyZ2V0KS5sZW5ndGhcblx0XHQpIHtcblx0XHRcdHdoZXJlID0gXCJDb250ZW50XCI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgZG91YmxlIHRhcFxuXHRcdGlmIChzZWxmLnRhcHBlZCkge1xuXHRcdFx0Ly8gU3RvcCBwcmV2aW91c2x5IGNyZWF0ZWQgc2luZ2xlIHRhcFxuXHRcdFx0Y2xlYXJUaW1lb3V0KHNlbGYudGFwcGVkKTtcblx0XHRcdHNlbGYudGFwcGVkID0gbnVsbDtcblxuXHRcdFx0Ly8gU2tpcCBpZiBkaXN0YW5jZSBiZXR3ZWVuIHRhcHMgaXMgdG9vIGJpZ1xuXHRcdFx0aWYgKE1hdGguYWJzKHRhcFggLSBzZWxmLnRhcFgpID4gNTAgfHwgTWF0aC5hYnModGFwWSAtIHNlbGYudGFwWSkgPiA1MCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0Ly8gT0ssIG5vdyB3ZSBhc3N1bWUgdGhhdCB0aGlzIGlzIGEgZG91YmxlLXRhcFxuXHRcdFx0cHJvY2VzcyhcImRibGNsaWNrXCIgKyB3aGVyZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFNpbmdsZSB0YXAgd2lsbCBiZSBwcm9jZXNzZWQgaWYgdXNlciBoYXMgbm90IGNsaWNrZWQgc2Vjb25kIHRpbWUgd2l0aGluIDMwMG1zXG5cdFx0XHQvLyBvciB0aGVyZSBpcyBubyBuZWVkIHRvIHdhaXQgZm9yIGRvdWJsZS10YXBcblx0XHRcdHNlbGYudGFwWCA9IHRhcFg7XG5cdFx0XHRzZWxmLnRhcFkgPSB0YXBZO1xuXG5cdFx0XHRpZiAoY3VycmVudC5vcHRzW1wiZGJsY2xpY2tcIiArIHdoZXJlXSAmJiBjdXJyZW50Lm9wdHNbXCJkYmxjbGlja1wiICsgd2hlcmVdICE9PSBjdXJyZW50Lm9wdHNbXCJjbGlja1wiICsgd2hlcmVdKSB7XG5cdFx0XHRcdHNlbGYudGFwcGVkID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLnRhcHBlZCA9IG51bGw7XG5cblx0XHRcdFx0XHRpZiAoIWluc3RhbmNlLmlzQW5pbWF0aW5nKSB7XG5cdFx0XHRcdFx0XHRwcm9jZXNzKFwiY2xpY2tcIiArIHdoZXJlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIDUwMCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwcm9jZXNzKFwiY2xpY2tcIiArIHdoZXJlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHQkKGRvY3VtZW50KVxuXHRcdC5vbihcIm9uQWN0aXZhdGUuZmJcIiwgZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdGlmIChpbnN0YW5jZSAmJiAhaW5zdGFuY2UuR3Vlc3R1cmVzKSB7XG5cdFx0XHRcdGluc3RhbmNlLkd1ZXN0dXJlcyA9IG5ldyBHdWVzdHVyZXMoaW5zdGFuY2UpO1xuXHRcdFx0fVxuXHRcdH0pXG5cdFx0Lm9uKFwiYmVmb3JlQ2xvc2UuZmJcIiwgZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5HdWVzdHVyZXMpIHtcblx0XHRcdFx0aW5zdGFuY2UuR3Vlc3R1cmVzLmRlc3Ryb3koKTtcblx0XHRcdH1cblx0XHR9KTtcbn0pKHdpbmRvdywgZG9jdW1lbnQsIGpRdWVyeSk7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vL1xuLy8gU2xpZGVTaG93XG4vLyBFbmFibGVzIHNsaWRlc2hvdyBmdW5jdGlvbmFsaXR5XG4vL1xuLy8gRXhhbXBsZSBvZiB1c2FnZTpcbi8vICQuZmFuY3lib3guZ2V0SW5zdGFuY2UoKS5TbGlkZVNob3cuc3RhcnQoKVxuLy9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4oZnVuY3Rpb24oZG9jdW1lbnQsICQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0JC5leHRlbmQodHJ1ZSwgJC5mYW5jeWJveC5kZWZhdWx0cywge1xuXHRcdGJ0blRwbDoge1xuXHRcdFx0c2xpZGVTaG93OlxuXHRcdFx0XHQnPGJ1dHRvbiBkYXRhLWZhbmN5Ym94LXBsYXkgY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS1wbGF5XCIgdGl0bGU9XCJ7e1BMQVlfU1RBUlR9fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNNi41IDUuNHYxMy4ybDExLTYuNnpcIi8+PC9zdmc+JyArXG5cdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk04LjMzIDUuNzVoMi4ydjEyLjVoLTIuMlY1Ljc1em01LjE1IDBoMi4ydjEyLjVoLTIuMlY1Ljc1elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8L2J1dHRvbj5cIlxuXHRcdH0sXG5cdFx0c2xpZGVTaG93OiB7XG5cdFx0XHRhdXRvU3RhcnQ6IGZhbHNlLFxuXHRcdFx0c3BlZWQ6IDMwMDAsXG5cdFx0XHRwcm9ncmVzczogdHJ1ZVxuXHRcdH1cblx0fSk7XG5cblx0dmFyIFNsaWRlU2hvdyA9IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG5cdFx0dGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xuXHRcdHRoaXMuaW5pdCgpO1xuXHR9O1xuXG5cdCQuZXh0ZW5kKFNsaWRlU2hvdy5wcm90b3R5cGUsIHtcblx0XHR0aW1lcjogbnVsbCxcblx0XHRpc0FjdGl2ZTogZmFsc2UsXG5cdFx0JGJ1dHRvbjogbnVsbCxcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRpbnN0YW5jZSA9IHNlbGYuaW5zdGFuY2UsXG5cdFx0XHRcdG9wdHMgPSBpbnN0YW5jZS5ncm91cFtpbnN0YW5jZS5jdXJySW5kZXhdLm9wdHMuc2xpZGVTaG93O1xuXG5cdFx0XHRzZWxmLiRidXR0b24gPSBpbnN0YW5jZS4kcmVmcy50b29sYmFyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC1wbGF5XVwiKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLnRvZ2dsZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChpbnN0YW5jZS5ncm91cC5sZW5ndGggPCAyIHx8ICFvcHRzKSB7XG5cdFx0XHRcdHNlbGYuJGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKG9wdHMucHJvZ3Jlc3MpIHtcblx0XHRcdFx0c2VsZi4kcHJvZ3Jlc3MgPSAkKCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtcHJvZ3Jlc3NcIj48L2Rpdj4nKS5hcHBlbmRUbyhpbnN0YW5jZS4kcmVmcy5pbm5lcik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHNldDogZnVuY3Rpb24oZm9yY2UpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0aW5zdGFuY2UgPSBzZWxmLmluc3RhbmNlLFxuXHRcdFx0XHRjdXJyZW50ID0gaW5zdGFuY2UuY3VycmVudDtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgcmVhY2hlZCBsYXN0IGVsZW1lbnRcblx0XHRcdGlmIChjdXJyZW50ICYmIChmb3JjZSA9PT0gdHJ1ZSB8fCBjdXJyZW50Lm9wdHMubG9vcCB8fCBpbnN0YW5jZS5jdXJySW5kZXggPCBpbnN0YW5jZS5ncm91cC5sZW5ndGggLSAxKSkge1xuXHRcdFx0XHRpZiAoc2VsZi5pc0FjdGl2ZSAmJiBjdXJyZW50LmNvbnRlbnRUeXBlICE9PSBcInZpZGVvXCIpIHtcblx0XHRcdFx0XHRpZiAoc2VsZi4kcHJvZ3Jlc3MpIHtcblx0XHRcdFx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShzZWxmLiRwcm9ncmVzcy5zaG93KCksIHtzY2FsZVg6IDF9LCBjdXJyZW50Lm9wdHMuc2xpZGVTaG93LnNwZWVkKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzZWxmLnRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGlmICghaW5zdGFuY2UuY3VycmVudC5vcHRzLmxvb3AgJiYgaW5zdGFuY2UuY3VycmVudC5pbmRleCA9PSBpbnN0YW5jZS5ncm91cC5sZW5ndGggLSAxKSB7XG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLmp1bXBUbygwKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLm5leHQoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LCBjdXJyZW50Lm9wdHMuc2xpZGVTaG93LnNwZWVkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5zdG9wKCk7XG5cdFx0XHRcdGluc3RhbmNlLmlkbGVTZWNvbmRzQ291bnRlciA9IDA7XG5cdFx0XHRcdGluc3RhbmNlLnNob3dDb250cm9scygpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRjbGVhcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdGNsZWFyVGltZW91dChzZWxmLnRpbWVyKTtcblxuXHRcdFx0c2VsZi50aW1lciA9IG51bGw7XG5cblx0XHRcdGlmIChzZWxmLiRwcm9ncmVzcykge1xuXHRcdFx0XHRzZWxmLiRwcm9ncmVzcy5yZW1vdmVBdHRyKFwic3R5bGVcIikuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRzdGFydDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmluc3RhbmNlLmN1cnJlbnQ7XG5cblx0XHRcdGlmIChjdXJyZW50KSB7XG5cdFx0XHRcdHNlbGYuJGJ1dHRvblxuXHRcdFx0XHRcdC5hdHRyKFwidGl0bGVcIiwgKGN1cnJlbnQub3B0cy5pMThuW2N1cnJlbnQub3B0cy5sYW5nXSB8fCBjdXJyZW50Lm9wdHMuaTE4bi5lbikuUExBWV9TVE9QKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWJ1dHRvbi0tcGxheVwiKVxuXHRcdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LWJ1dHRvbi0tcGF1c2VcIik7XG5cblx0XHRcdFx0c2VsZi5pc0FjdGl2ZSA9IHRydWU7XG5cblx0XHRcdFx0aWYgKGN1cnJlbnQuaXNDb21wbGV0ZSkge1xuXHRcdFx0XHRcdHNlbGYuc2V0KHRydWUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VsZi5pbnN0YW5jZS50cmlnZ2VyKFwib25TbGlkZVNob3dDaGFuZ2VcIiwgdHJ1ZSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHN0b3A6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5pbnN0YW5jZS5jdXJyZW50O1xuXG5cdFx0XHRzZWxmLmNsZWFyKCk7XG5cblx0XHRcdHNlbGYuJGJ1dHRvblxuXHRcdFx0XHQuYXR0cihcInRpdGxlXCIsIChjdXJyZW50Lm9wdHMuaTE4bltjdXJyZW50Lm9wdHMubGFuZ10gfHwgY3VycmVudC5vcHRzLmkxOG4uZW4pLlBMQVlfU1RBUlQpXG5cdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWJ1dHRvbi0tcGF1c2VcIilcblx0XHRcdFx0LmFkZENsYXNzKFwiZmFuY3lib3gtYnV0dG9uLS1wbGF5XCIpO1xuXG5cdFx0XHRzZWxmLmlzQWN0aXZlID0gZmFsc2U7XG5cblx0XHRcdHNlbGYuaW5zdGFuY2UudHJpZ2dlcihcIm9uU2xpZGVTaG93Q2hhbmdlXCIsIGZhbHNlKTtcblxuXHRcdFx0aWYgKHNlbGYuJHByb2dyZXNzKSB7XG5cdFx0XHRcdHNlbGYuJHByb2dyZXNzLnJlbW92ZUF0dHIoXCJzdHlsZVwiKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHRvZ2dsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdGlmIChzZWxmLmlzQWN0aXZlKSB7XG5cdFx0XHRcdHNlbGYuc3RvcCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5zdGFydCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0JChkb2N1bWVudCkub24oe1xuXHRcdFwib25Jbml0LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlKSB7XG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgIWluc3RhbmNlLlNsaWRlU2hvdykge1xuXHRcdFx0XHRpbnN0YW5jZS5TbGlkZVNob3cgPSBuZXcgU2xpZGVTaG93KGluc3RhbmNlKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0XCJiZWZvcmVTaG93LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBjdXJyZW50LCBmaXJzdFJ1bikge1xuXHRcdFx0dmFyIFNsaWRlU2hvdyA9IGluc3RhbmNlICYmIGluc3RhbmNlLlNsaWRlU2hvdztcblxuXHRcdFx0aWYgKGZpcnN0UnVuKSB7XG5cdFx0XHRcdGlmIChTbGlkZVNob3cgJiYgY3VycmVudC5vcHRzLnNsaWRlU2hvdy5hdXRvU3RhcnQpIHtcblx0XHRcdFx0XHRTbGlkZVNob3cuc3RhcnQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmIChTbGlkZVNob3cgJiYgU2xpZGVTaG93LmlzQWN0aXZlKSB7XG5cdFx0XHRcdFNsaWRlU2hvdy5jbGVhcigpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImFmdGVyU2hvdy5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgY3VycmVudCkge1xuXHRcdFx0dmFyIFNsaWRlU2hvdyA9IGluc3RhbmNlICYmIGluc3RhbmNlLlNsaWRlU2hvdztcblxuXHRcdFx0aWYgKFNsaWRlU2hvdyAmJiBTbGlkZVNob3cuaXNBY3RpdmUpIHtcblx0XHRcdFx0U2xpZGVTaG93LnNldCgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImFmdGVyS2V5ZG93bi5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgY3VycmVudCwga2V5cHJlc3MsIGtleWNvZGUpIHtcblx0XHRcdHZhciBTbGlkZVNob3cgPSBpbnN0YW5jZSAmJiBpbnN0YW5jZS5TbGlkZVNob3c7XG5cblx0XHRcdC8vIFwiUFwiIG9yIFNwYWNlYmFyXG5cdFx0XHRpZiAoU2xpZGVTaG93ICYmIGN1cnJlbnQub3B0cy5zbGlkZVNob3cgJiYgKGtleWNvZGUgPT09IDgwIHx8IGtleWNvZGUgPT09IDMyKSAmJiAhJChkb2N1bWVudC5hY3RpdmVFbGVtZW50KS5pcyhcImJ1dHRvbixhLGlucHV0XCIpKSB7XG5cdFx0XHRcdGtleXByZXNzLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0U2xpZGVTaG93LnRvZ2dsZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImJlZm9yZUNsb3NlLmZiIG9uRGVhY3RpdmF0ZS5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSkge1xuXHRcdFx0dmFyIFNsaWRlU2hvdyA9IGluc3RhbmNlICYmIGluc3RhbmNlLlNsaWRlU2hvdztcblxuXHRcdFx0aWYgKFNsaWRlU2hvdykge1xuXHRcdFx0XHRTbGlkZVNob3cuc3RvcCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0Ly8gUGFnZSBWaXNpYmlsaXR5IEFQSSB0byBwYXVzZSBzbGlkZXNob3cgd2hlbiB3aW5kb3cgaXMgbm90IGFjdGl2ZVxuXHQkKGRvY3VtZW50KS5vbihcInZpc2liaWxpdHljaGFuZ2VcIiwgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGluc3RhbmNlID0gJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpLFxuXHRcdFx0U2xpZGVTaG93ID0gaW5zdGFuY2UgJiYgaW5zdGFuY2UuU2xpZGVTaG93O1xuXG5cdFx0aWYgKFNsaWRlU2hvdyAmJiBTbGlkZVNob3cuaXNBY3RpdmUpIHtcblx0XHRcdGlmIChkb2N1bWVudC5oaWRkZW4pIHtcblx0XHRcdFx0U2xpZGVTaG93LmNsZWFyKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRTbGlkZVNob3cuc2V0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcbn0pKGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIEZ1bGxTY3JlZW5cbi8vIEFkZHMgZnVsbHNjcmVlbiBmdW5jdGlvbmFsaXR5XG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbihkb2N1bWVudCwgJCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHQvLyBDb2xsZWN0aW9uIG9mIG1ldGhvZHMgc3VwcG9ydGVkIGJ5IHVzZXIgYnJvd3NlclxuXHR2YXIgZm4gPSAoZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGZuTWFwID0gW1xuXHRcdFx0W1wicmVxdWVzdEZ1bGxzY3JlZW5cIiwgXCJleGl0RnVsbHNjcmVlblwiLCBcImZ1bGxzY3JlZW5FbGVtZW50XCIsIFwiZnVsbHNjcmVlbkVuYWJsZWRcIiwgXCJmdWxsc2NyZWVuY2hhbmdlXCIsIFwiZnVsbHNjcmVlbmVycm9yXCJdLFxuXHRcdFx0Ly8gbmV3IFdlYktpdFxuXHRcdFx0W1xuXHRcdFx0XHRcIndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuXCIsXG5cdFx0XHRcdFwid2Via2l0RXhpdEZ1bGxzY3JlZW5cIixcblx0XHRcdFx0XCJ3ZWJraXRGdWxsc2NyZWVuRWxlbWVudFwiLFxuXHRcdFx0XHRcIndlYmtpdEZ1bGxzY3JlZW5FbmFibGVkXCIsXG5cdFx0XHRcdFwid2Via2l0ZnVsbHNjcmVlbmNoYW5nZVwiLFxuXHRcdFx0XHRcIndlYmtpdGZ1bGxzY3JlZW5lcnJvclwiXG5cdFx0XHRdLFxuXHRcdFx0Ly8gb2xkIFdlYktpdCAoU2FmYXJpIDUuMSlcblx0XHRcdFtcblx0XHRcdFx0XCJ3ZWJraXRSZXF1ZXN0RnVsbFNjcmVlblwiLFxuXHRcdFx0XHRcIndlYmtpdENhbmNlbEZ1bGxTY3JlZW5cIixcblx0XHRcdFx0XCJ3ZWJraXRDdXJyZW50RnVsbFNjcmVlbkVsZW1lbnRcIixcblx0XHRcdFx0XCJ3ZWJraXRDYW5jZWxGdWxsU2NyZWVuXCIsXG5cdFx0XHRcdFwid2Via2l0ZnVsbHNjcmVlbmNoYW5nZVwiLFxuXHRcdFx0XHRcIndlYmtpdGZ1bGxzY3JlZW5lcnJvclwiXG5cdFx0XHRdLFxuXHRcdFx0W1xuXHRcdFx0XHRcIm1velJlcXVlc3RGdWxsU2NyZWVuXCIsXG5cdFx0XHRcdFwibW96Q2FuY2VsRnVsbFNjcmVlblwiLFxuXHRcdFx0XHRcIm1vekZ1bGxTY3JlZW5FbGVtZW50XCIsXG5cdFx0XHRcdFwibW96RnVsbFNjcmVlbkVuYWJsZWRcIixcblx0XHRcdFx0XCJtb3pmdWxsc2NyZWVuY2hhbmdlXCIsXG5cdFx0XHRcdFwibW96ZnVsbHNjcmVlbmVycm9yXCJcblx0XHRcdF0sXG5cdFx0XHRbXCJtc1JlcXVlc3RGdWxsc2NyZWVuXCIsIFwibXNFeGl0RnVsbHNjcmVlblwiLCBcIm1zRnVsbHNjcmVlbkVsZW1lbnRcIiwgXCJtc0Z1bGxzY3JlZW5FbmFibGVkXCIsIFwiTVNGdWxsc2NyZWVuQ2hhbmdlXCIsIFwiTVNGdWxsc2NyZWVuRXJyb3JcIl1cblx0XHRdO1xuXG5cdFx0dmFyIHJldCA9IHt9O1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBmbk1hcC5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHZhbCA9IGZuTWFwW2ldO1xuXG5cdFx0XHRpZiAodmFsICYmIHZhbFsxXSBpbiBkb2N1bWVudCkge1xuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHZhbC5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdHJldFtmbk1hcFswXVtqXV0gPSB2YWxbal07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gcmV0O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSkoKTtcblxuXHRpZiAoZm4pIHtcblx0XHR2YXIgRnVsbFNjcmVlbiA9IHtcblx0XHRcdHJlcXVlc3Q6IGZ1bmN0aW9uKGVsZW0pIHtcblx0XHRcdFx0ZWxlbSA9IGVsZW0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG5cdFx0XHRcdGVsZW1bZm4ucmVxdWVzdEZ1bGxzY3JlZW5dKGVsZW0uQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuXHRcdFx0fSxcblx0XHRcdGV4aXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRkb2N1bWVudFtmbi5leGl0RnVsbHNjcmVlbl0oKTtcblx0XHRcdH0sXG5cdFx0XHR0b2dnbGU6IGZ1bmN0aW9uKGVsZW0pIHtcblx0XHRcdFx0ZWxlbSA9IGVsZW0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG5cdFx0XHRcdGlmICh0aGlzLmlzRnVsbHNjcmVlbigpKSB7XG5cdFx0XHRcdFx0dGhpcy5leGl0KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5yZXF1ZXN0KGVsZW0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0aXNGdWxsc2NyZWVuOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIEJvb2xlYW4oZG9jdW1lbnRbZm4uZnVsbHNjcmVlbkVsZW1lbnRdKTtcblx0XHRcdH0sXG5cdFx0XHRlbmFibGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIEJvb2xlYW4oZG9jdW1lbnRbZm4uZnVsbHNjcmVlbkVuYWJsZWRdKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0JC5leHRlbmQodHJ1ZSwgJC5mYW5jeWJveC5kZWZhdWx0cywge1xuXHRcdFx0YnRuVHBsOiB7XG5cdFx0XHRcdGZ1bGxTY3JlZW46XG5cdFx0XHRcdFx0JzxidXR0b24gZGF0YS1mYW5jeWJveC1mdWxsc2NyZWVuIGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tZnNlbnRlclwiIHRpdGxlPVwie3tGVUxMX1NDUkVFTn19XCI+JyArXG5cdFx0XHRcdFx0JzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTcgMTRINXY1aDV2LTJIN3YtM3ptLTItNGgyVjdoM1Y1SDV2NXptMTIgN2gtM3YyaDV2LTVoLTJ2M3pNMTQgNXYyaDN2M2gyVjVoLTV6XCIvPjwvc3ZnPicgK1xuXHRcdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk01IDE2aDN2M2gydi01SDV6bTMtOEg1djJoNVY1SDh6bTYgMTFoMnYtM2gzdi0yaC01em0yLTExVjVoLTJ2NWg1Vjh6XCIvPjwvc3ZnPicgK1xuXHRcdFx0XHRcdFwiPC9idXR0b24+XCJcblx0XHRcdH0sXG5cdFx0XHRmdWxsU2NyZWVuOiB7XG5cdFx0XHRcdGF1dG9TdGFydDogZmFsc2Vcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdCQoZG9jdW1lbnQpLm9uKGZuLmZ1bGxzY3JlZW5jaGFuZ2UsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGlzRnVsbHNjcmVlbiA9IEZ1bGxTY3JlZW4uaXNGdWxsc2NyZWVuKCksXG5cdFx0XHRcdGluc3RhbmNlID0gJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpO1xuXG5cdFx0XHRpZiAoaW5zdGFuY2UpIHtcblx0XHRcdFx0Ly8gSWYgaW1hZ2UgaXMgem9vbWluZywgdGhlbiBmb3JjZSB0byBzdG9wIGFuZCByZXBvc2l0aW9uIHByb3Blcmx5XG5cdFx0XHRcdGlmIChpbnN0YW5jZS5jdXJyZW50ICYmIGluc3RhbmNlLmN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiICYmIGluc3RhbmNlLmlzQW5pbWF0aW5nKSB7XG5cdFx0XHRcdFx0aW5zdGFuY2UuY3VycmVudC4kY29udGVudC5jc3MoXCJ0cmFuc2l0aW9uXCIsIFwibm9uZVwiKTtcblxuXHRcdFx0XHRcdGluc3RhbmNlLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cblx0XHRcdFx0XHRpbnN0YW5jZS51cGRhdGUodHJ1ZSwgdHJ1ZSwgMCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpbnN0YW5jZS50cmlnZ2VyKFwib25GdWxsc2NyZWVuQ2hhbmdlXCIsIGlzRnVsbHNjcmVlbik7XG5cblx0XHRcdFx0aW5zdGFuY2UuJHJlZnMuY29udGFpbmVyLnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtaXMtZnVsbHNjcmVlblwiLCBpc0Z1bGxzY3JlZW4pO1xuXG5cdFx0XHRcdGluc3RhbmNlLiRyZWZzLnRvb2xiYXJcblx0XHRcdFx0XHQuZmluZChcIltkYXRhLWZhbmN5Ym94LWZ1bGxzY3JlZW5dXCIpXG5cdFx0XHRcdFx0LnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtYnV0dG9uLS1mc2VudGVyXCIsICFpc0Z1bGxzY3JlZW4pXG5cdFx0XHRcdFx0LnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtYnV0dG9uLS1mc2V4aXRcIiwgaXNGdWxsc2NyZWVuKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoZG9jdW1lbnQpLm9uKHtcblx0XHRcIm9uSW5pdC5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSkge1xuXHRcdFx0dmFyICRjb250YWluZXI7XG5cblx0XHRcdGlmICghZm4pIHtcblx0XHRcdFx0aW5zdGFuY2UuJHJlZnMudG9vbGJhci5maW5kKFwiW2RhdGEtZmFuY3lib3gtZnVsbHNjcmVlbl1cIikucmVtb3ZlKCk7XG5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZ3JvdXBbaW5zdGFuY2UuY3VyckluZGV4XS5vcHRzLmZ1bGxTY3JlZW4pIHtcblx0XHRcdFx0JGNvbnRhaW5lciA9IGluc3RhbmNlLiRyZWZzLmNvbnRhaW5lcjtcblxuXHRcdFx0XHQkY29udGFpbmVyLm9uKFwiY2xpY2suZmItZnVsbHNjcmVlblwiLCBcIltkYXRhLWZhbmN5Ym94LWZ1bGxzY3JlZW5dXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdEZ1bGxTY3JlZW4udG9nZ2xlKCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGlmIChpbnN0YW5jZS5vcHRzLmZ1bGxTY3JlZW4gJiYgaW5zdGFuY2Uub3B0cy5mdWxsU2NyZWVuLmF1dG9TdGFydCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdEZ1bGxTY3JlZW4ucmVxdWVzdCgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRXhwb3NlIEFQSVxuXHRcdFx0XHRpbnN0YW5jZS5GdWxsU2NyZWVuID0gRnVsbFNjcmVlbjtcblx0XHRcdH0gZWxzZSBpZiAoaW5zdGFuY2UpIHtcblx0XHRcdFx0aW5zdGFuY2UuJHJlZnMudG9vbGJhci5maW5kKFwiW2RhdGEtZmFuY3lib3gtZnVsbHNjcmVlbl1cIikuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImFmdGVyS2V5ZG93bi5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgY3VycmVudCwga2V5cHJlc3MsIGtleWNvZGUpIHtcblx0XHRcdC8vIFwiRlwiXG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuRnVsbFNjcmVlbiAmJiBrZXljb2RlID09PSA3MCkge1xuXHRcdFx0XHRrZXlwcmVzcy5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdGluc3RhbmNlLkZ1bGxTY3JlZW4udG9nZ2xlKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFwiYmVmb3JlQ2xvc2UuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5GdWxsU2NyZWVuICYmIGluc3RhbmNlLiRyZWZzLmNvbnRhaW5lci5oYXNDbGFzcyhcImZhbmN5Ym94LWlzLWZ1bGxzY3JlZW5cIikpIHtcblx0XHRcdFx0RnVsbFNjcmVlbi5leGl0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcbn0pKGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIFRodW1ic1xuLy8gRGlzcGxheXMgdGh1bWJuYWlscyBpbiBhIGdyaWRcbi8vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuKGZ1bmN0aW9uKGRvY3VtZW50LCAkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdHZhciBDTEFTUyA9IFwiZmFuY3lib3gtdGh1bWJzXCIsXG5cdFx0Q0xBU1NfQUNUSVZFID0gQ0xBU1MgKyBcIi1hY3RpdmVcIjtcblxuXHQvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIGRlZmF1bHQgdmFsdWVzXG5cdCQuZmFuY3lib3guZGVmYXVsdHMgPSAkLmV4dGVuZChcblx0XHR0cnVlLFxuXHRcdHtcblx0XHRcdGJ0blRwbDoge1xuXHRcdFx0XHR0aHVtYnM6XG5cdFx0XHRcdFx0JzxidXR0b24gZGF0YS1mYW5jeWJveC10aHVtYnMgY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS10aHVtYnNcIiB0aXRsZT1cInt7VEhVTUJTfX1cIj4nICtcblx0XHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMTQuNTkgMTQuNTloMy43NnYzLjc2aC0zLjc2di0zLjc2em0tNC40NyAwaDMuNzZ2My43NmgtMy43NnYtMy43NnptLTQuNDcgMGgzLjc2djMuNzZINS42NXYtMy43NnptOC45NC00LjQ3aDMuNzZ2My43NmgtMy43NnYtMy43NnptLTQuNDcgMGgzLjc2djMuNzZoLTMuNzZ2LTMuNzZ6bS00LjQ3IDBoMy43NnYzLjc2SDUuNjV2LTMuNzZ6bTguOTQtNC40N2gzLjc2djMuNzZoLTMuNzZWNS42NXptLTQuNDcgMGgzLjc2djMuNzZoLTMuNzZWNS42NXptLTQuNDcgMGgzLjc2djMuNzZINS42NVY1LjY1elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XHRcIjwvYnV0dG9uPlwiXG5cdFx0XHR9LFxuXHRcdFx0dGh1bWJzOiB7XG5cdFx0XHRcdGF1dG9TdGFydDogZmFsc2UsIC8vIERpc3BsYXkgdGh1bWJuYWlscyBvbiBvcGVuaW5nXG5cdFx0XHRcdGhpZGVPbkNsb3NlOiB0cnVlLCAvLyBIaWRlIHRodW1ibmFpbCBncmlkIHdoZW4gY2xvc2luZyBhbmltYXRpb24gc3RhcnRzXG5cdFx0XHRcdHBhcmVudEVsOiBcIi5mYW5jeWJveC1jb250YWluZXJcIiwgLy8gQ29udGFpbmVyIGlzIGluamVjdGVkIGludG8gdGhpcyBlbGVtZW50XG5cdFx0XHRcdGF4aXM6IFwieVwiIC8vIFZlcnRpY2FsICh5KSBvciBob3Jpem9udGFsICh4KSBzY3JvbGxpbmdcblx0XHRcdH1cblx0XHR9LFxuXHRcdCQuZmFuY3lib3guZGVmYXVsdHNcblx0KTtcblxuXHR2YXIgRmFuY3lUaHVtYnMgPSBmdW5jdGlvbihpbnN0YW5jZSkge1xuXHRcdHRoaXMuaW5pdChpbnN0YW5jZSk7XG5cdH07XG5cblx0JC5leHRlbmQoRmFuY3lUaHVtYnMucHJvdG90eXBlLCB7XG5cdFx0JGJ1dHRvbjogbnVsbCxcblx0XHQkZ3JpZDogbnVsbCxcblx0XHQkbGlzdDogbnVsbCxcblx0XHRpc1Zpc2libGU6IGZhbHNlLFxuXHRcdGlzQWN0aXZlOiBmYWxzZSxcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGdyb3VwID0gaW5zdGFuY2UuZ3JvdXAsXG5cdFx0XHRcdGVuYWJsZWQgPSAwO1xuXG5cdFx0XHRzZWxmLmluc3RhbmNlID0gaW5zdGFuY2U7XG5cdFx0XHRzZWxmLm9wdHMgPSBncm91cFtpbnN0YW5jZS5jdXJySW5kZXhdLm9wdHMudGh1bWJzO1xuXG5cdFx0XHRpbnN0YW5jZS5UaHVtYnMgPSBzZWxmO1xuXG5cdFx0XHRzZWxmLiRidXR0b24gPSBpbnN0YW5jZS4kcmVmcy50b29sYmFyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC10aHVtYnNdXCIpO1xuXG5cdFx0XHQvLyBFbmFibGUgdGh1bWJzIGlmIGF0IGxlYXN0IHR3byBncm91cCBpdGVtcyBoYXZlIHRodW1ibmFpbHNcblx0XHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBncm91cC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0XHRpZiAoZ3JvdXBbaV0udGh1bWIpIHtcblx0XHRcdFx0XHRlbmFibGVkKys7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoZW5hYmxlZCA+IDEpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZW5hYmxlZCA+IDEgJiYgISFzZWxmLm9wdHMpIHtcblx0XHRcdFx0c2VsZi4kYnV0dG9uLnJlbW92ZUF0dHIoXCJzdHlsZVwiKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYudG9nZ2xlKCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNlbGYuaXNBY3RpdmUgPSB0cnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi4kYnV0dG9uLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Y3JlYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0aW5zdGFuY2UgPSBzZWxmLmluc3RhbmNlLFxuXHRcdFx0XHRwYXJlbnRFbCA9IHNlbGYub3B0cy5wYXJlbnRFbCxcblx0XHRcdFx0bGlzdCA9IFtdLFxuXHRcdFx0XHRzcmM7XG5cblx0XHRcdGlmICghc2VsZi4kZ3JpZCkge1xuXHRcdFx0XHQvLyBDcmVhdGUgbWFpbiBlbGVtZW50XG5cdFx0XHRcdHNlbGYuJGdyaWQgPSAkKCc8ZGl2IGNsYXNzPVwiJyArIENMQVNTICsgXCIgXCIgKyBDTEFTUyArIFwiLVwiICsgc2VsZi5vcHRzLmF4aXMgKyAnXCI+PC9kaXY+JykuYXBwZW5kVG8oXG5cdFx0XHRcdFx0aW5zdGFuY2UuJHJlZnMuY29udGFpbmVyXG5cdFx0XHRcdFx0XHQuZmluZChwYXJlbnRFbClcblx0XHRcdFx0XHRcdC5hZGRCYWNrKClcblx0XHRcdFx0XHRcdC5maWx0ZXIocGFyZW50RWwpXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0Ly8gQWRkIFwiY2xpY2tcIiBldmVudCB0aGF0IHBlcmZvcm1zIGdhbGxlcnkgbmF2aWdhdGlvblxuXHRcdFx0XHRzZWxmLiRncmlkLm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGluc3RhbmNlLmp1bXBUbygkKHRoaXMpLmF0dHIoXCJkYXRhLWluZGV4XCIpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEJ1aWxkIHRoZSBsaXN0XG5cdFx0XHRpZiAoIXNlbGYuJGxpc3QpIHtcblx0XHRcdFx0c2VsZi4kbGlzdCA9ICQoJzxkaXYgY2xhc3M9XCInICsgQ0xBU1MgKyAnX19saXN0XCI+JykuYXBwZW5kVG8oc2VsZi4kZ3JpZCk7XG5cdFx0XHR9XG5cblx0XHRcdCQuZWFjaChpbnN0YW5jZS5ncm91cCwgZnVuY3Rpb24oaSwgaXRlbSkge1xuXHRcdFx0XHRzcmMgPSBpdGVtLnRodW1iO1xuXG5cdFx0XHRcdGlmICghc3JjICYmIGl0ZW0udHlwZSA9PT0gXCJpbWFnZVwiKSB7XG5cdFx0XHRcdFx0c3JjID0gaXRlbS5zcmM7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsaXN0LnB1c2goXG5cdFx0XHRcdFx0JzxhIGhyZWY9XCJqYXZhc2NyaXB0OjtcIiB0YWJpbmRleD1cIjBcIiBkYXRhLWluZGV4PVwiJyArXG5cdFx0XHRcdFx0aSArXG5cdFx0XHRcdFx0J1wiJyArXG5cdFx0XHRcdFx0KHNyYyAmJiBzcmMubGVuZ3RoID8gJyBzdHlsZT1cImJhY2tncm91bmQtaW1hZ2U6dXJsKCcgKyBzcmMgKyAnKVwiJyA6ICdjbGFzcz1cImZhbmN5Ym94LXRodW1icy1taXNzaW5nXCInKSArXG5cdFx0XHRcdFx0XCI+PC9hPlwiXG5cdFx0XHRcdCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0c2VsZi4kbGlzdFswXS5pbm5lckhUTUwgPSBsaXN0LmpvaW4oXCJcIik7XG5cblx0XHRcdGlmIChzZWxmLm9wdHMuYXhpcyA9PT0gXCJ4XCIpIHtcblx0XHRcdFx0Ly8gU2V0IGZpeGVkIHdpZHRoIGZvciBsaXN0IGVsZW1lbnQgdG8gZW5hYmxlIGhvcml6b250YWwgc2Nyb2xsaW5nXG5cdFx0XHRcdHNlbGYuJGxpc3Qud2lkdGgoXG5cdFx0XHRcdFx0cGFyc2VJbnQoc2VsZi4kZ3JpZC5jc3MoXCJwYWRkaW5nLXJpZ2h0XCIpLCAxMCkgK1xuXHRcdFx0XHRcdGluc3RhbmNlLmdyb3VwLmxlbmd0aCAqXG5cdFx0XHRcdFx0c2VsZi4kbGlzdFxuXHRcdFx0XHRcdFx0LmNoaWxkcmVuKClcblx0XHRcdFx0XHRcdC5lcSgwKVxuXHRcdFx0XHRcdFx0Lm91dGVyV2lkdGgodHJ1ZSlcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Zm9jdXM6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRsaXN0ID0gc2VsZi4kbGlzdCxcblx0XHRcdFx0JGdyaWQgPSBzZWxmLiRncmlkLFxuXHRcdFx0XHR0aHVtYixcblx0XHRcdFx0dGh1bWJQb3M7XG5cblx0XHRcdGlmICghc2VsZi5pbnN0YW5jZS5jdXJyZW50KSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGh1bWIgPSAkbGlzdFxuXHRcdFx0XHQuY2hpbGRyZW4oKVxuXHRcdFx0XHQucmVtb3ZlQ2xhc3MoQ0xBU1NfQUNUSVZFKVxuXHRcdFx0XHQuZmlsdGVyKCdbZGF0YS1pbmRleD1cIicgKyBzZWxmLmluc3RhbmNlLmN1cnJlbnQuaW5kZXggKyAnXCJdJylcblx0XHRcdFx0LmFkZENsYXNzKENMQVNTX0FDVElWRSk7XG5cblx0XHRcdHRodW1iUG9zID0gdGh1bWIucG9zaXRpb24oKTtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgbmVlZCB0byBzY3JvbGwgdG8gbWFrZSBjdXJyZW50IHRodW1iIHZpc2libGVcblx0XHRcdGlmIChzZWxmLm9wdHMuYXhpcyA9PT0gXCJ5XCIgJiYgKHRodW1iUG9zLnRvcCA8IDAgfHwgdGh1bWJQb3MudG9wID4gJGxpc3QuaGVpZ2h0KCkgLSB0aHVtYi5vdXRlckhlaWdodCgpKSkge1xuXHRcdFx0XHQkbGlzdC5zdG9wKCkuYW5pbWF0ZShcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRzY3JvbGxUb3A6ICRsaXN0LnNjcm9sbFRvcCgpICsgdGh1bWJQb3MudG9wXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkdXJhdGlvblxuXHRcdFx0XHQpO1xuXHRcdFx0fSBlbHNlIGlmIChcblx0XHRcdFx0c2VsZi5vcHRzLmF4aXMgPT09IFwieFwiICYmXG5cdFx0XHRcdCh0aHVtYlBvcy5sZWZ0IDwgJGdyaWQuc2Nyb2xsTGVmdCgpIHx8IHRodW1iUG9zLmxlZnQgPiAkZ3JpZC5zY3JvbGxMZWZ0KCkgKyAoJGdyaWQud2lkdGgoKSAtIHRodW1iLm91dGVyV2lkdGgoKSkpXG5cdFx0XHQpIHtcblx0XHRcdFx0JGxpc3Rcblx0XHRcdFx0XHQucGFyZW50KClcblx0XHRcdFx0XHQuc3RvcCgpXG5cdFx0XHRcdFx0LmFuaW1hdGUoXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbExlZnQ6IHRodW1iUG9zLmxlZnRcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRkdXJhdGlvblxuXHRcdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHVwZGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR0aGF0Lmluc3RhbmNlLiRyZWZzLmNvbnRhaW5lci50b2dnbGVDbGFzcyhcImZhbmN5Ym94LXNob3ctdGh1bWJzXCIsIHRoaXMuaXNWaXNpYmxlKTtcblxuXHRcdFx0aWYgKHRoYXQuaXNWaXNpYmxlKSB7XG5cdFx0XHRcdGlmICghdGhhdC4kZ3JpZCkge1xuXHRcdFx0XHRcdHRoYXQuY3JlYXRlKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGF0Lmluc3RhbmNlLnRyaWdnZXIoXCJvblRodW1ic1Nob3dcIik7XG5cblx0XHRcdFx0dGhhdC5mb2N1cygwKTtcblx0XHRcdH0gZWxzZSBpZiAodGhhdC4kZ3JpZCkge1xuXHRcdFx0XHR0aGF0Lmluc3RhbmNlLnRyaWdnZXIoXCJvblRodW1ic0hpZGVcIik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFVwZGF0ZSBjb250ZW50IHBvc2l0aW9uXG5cdFx0XHR0aGF0Lmluc3RhbmNlLnVwZGF0ZSgpO1xuXHRcdH0sXG5cblx0XHRoaWRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuaXNWaXNpYmxlID0gZmFsc2U7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdH0sXG5cblx0XHRzaG93OiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuaXNWaXNpYmxlID0gdHJ1ZTtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0fSxcblxuXHRcdHRvZ2dsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmlzVmlzaWJsZSA9ICF0aGlzLmlzVmlzaWJsZTtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkKGRvY3VtZW50KS5vbih7XG5cdFx0XCJvbkluaXQuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdHZhciBUaHVtYnM7XG5cblx0XHRcdGlmIChpbnN0YW5jZSAmJiAhaW5zdGFuY2UuVGh1bWJzKSB7XG5cdFx0XHRcdFRodW1icyA9IG5ldyBGYW5jeVRodW1icyhpbnN0YW5jZSk7XG5cblx0XHRcdFx0aWYgKFRodW1icy5pc0FjdGl2ZSAmJiBUaHVtYnMub3B0cy5hdXRvU3RhcnQgPT09IHRydWUpIHtcblx0XHRcdFx0XHRUaHVtYnMuc2hvdygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFwiYmVmb3JlU2hvdy5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgaXRlbSwgZmlyc3RSdW4pIHtcblx0XHRcdHZhciBUaHVtYnMgPSBpbnN0YW5jZSAmJiBpbnN0YW5jZS5UaHVtYnM7XG5cblx0XHRcdGlmIChUaHVtYnMgJiYgVGh1bWJzLmlzVmlzaWJsZSkge1xuXHRcdFx0XHRUaHVtYnMuZm9jdXMoZmlyc3RSdW4gPyAwIDogMjUwKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0XCJhZnRlcktleWRvd24uZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGN1cnJlbnQsIGtleXByZXNzLCBrZXljb2RlKSB7XG5cdFx0XHR2YXIgVGh1bWJzID0gaW5zdGFuY2UgJiYgaW5zdGFuY2UuVGh1bWJzO1xuXG5cdFx0XHQvLyBcIkdcIlxuXHRcdFx0aWYgKFRodW1icyAmJiBUaHVtYnMuaXNBY3RpdmUgJiYga2V5Y29kZSA9PT0gNzEpIHtcblx0XHRcdFx0a2V5cHJlc3MucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRUaHVtYnMudG9nZ2xlKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFwiYmVmb3JlQ2xvc2UuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdHZhciBUaHVtYnMgPSBpbnN0YW5jZSAmJiBpbnN0YW5jZS5UaHVtYnM7XG5cblx0XHRcdGlmIChUaHVtYnMgJiYgVGh1bWJzLmlzVmlzaWJsZSAmJiBUaHVtYnMub3B0cy5oaWRlT25DbG9zZSAhPT0gZmFsc2UpIHtcblx0XHRcdFx0VGh1bWJzLiRncmlkLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xufSkoZG9jdW1lbnQsIGpRdWVyeSk7XG5cbi8vLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vXG4vLyBTaGFyZVxuLy8gRGlzcGxheXMgc2ltcGxlIGZvcm0gZm9yIHNoYXJpbmcgY3VycmVudCB1cmxcbi8vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuKGZ1bmN0aW9uKGRvY3VtZW50LCAkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdCQuZXh0ZW5kKHRydWUsICQuZmFuY3lib3guZGVmYXVsdHMsIHtcblx0XHRidG5UcGw6IHtcblx0XHRcdHNoYXJlOlxuXHRcdFx0XHQnPGJ1dHRvbiBkYXRhLWZhbmN5Ym94LXNoYXJlIGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tc2hhcmVcIiB0aXRsZT1cInt7U0hBUkV9fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMi41NSAxOWMxLjQtOC40IDkuMS05LjggMTEuOS05LjhWNWw3IDctNyA2LjN2LTMuNWMtMi44IDAtMTAuNSAyLjEtMTEuOSA0LjJ6XCIvPjwvc3ZnPicgK1xuXHRcdFx0XHRcIjwvYnV0dG9uPlwiXG5cdFx0fSxcblx0XHRzaGFyZToge1xuXHRcdFx0dXJsOiBmdW5jdGlvbihpbnN0YW5jZSwgaXRlbSkge1xuXHRcdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHRcdCghaW5zdGFuY2UuY3VycmVudEhhc2ggJiYgIShpdGVtLnR5cGUgPT09IFwiaW5saW5lXCIgfHwgaXRlbS50eXBlID09PSBcImh0bWxcIikgPyBpdGVtLm9yaWdTcmMgfHwgaXRlbS5zcmMgOiBmYWxzZSkgfHwgd2luZG93LmxvY2F0aW9uXG5cdFx0XHRcdCk7XG5cdFx0XHR9LFxuXHRcdFx0dHBsOlxuXHRcdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LXNoYXJlXCI+JyArXG5cdFx0XHRcdFwiPGgxPnt7U0hBUkV9fTwvaDE+XCIgK1xuXHRcdFx0XHRcIjxwPlwiICtcblx0XHRcdFx0JzxhIGNsYXNzPVwiZmFuY3lib3gtc2hhcmVfX2J1dHRvbiBmYW5jeWJveC1zaGFyZV9fYnV0dG9uLS1mYlwiIGhyZWY9XCJodHRwczovL3d3dy5mYWNlYm9vay5jb20vc2hhcmVyL3NoYXJlci5waHA/dT17e3VybH19XCI+JyArXG5cdFx0XHRcdCc8c3ZnIHZpZXdCb3g9XCIwIDAgNTEyIDUxMlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cGF0aCBkPVwibTI4NyA0NTZ2LTI5OWMwLTIxIDYtMzUgMzUtMzVoMzh2LTYzYy03LTEtMjktMy01NS0zLTU0IDAtOTEgMzMtOTEgOTR2MzA2bTE0My0yNTRoLTIwNXY3MmgxOTZcIiAvPjwvc3ZnPicgK1xuXHRcdFx0XHRcIjxzcGFuPkZhY2Vib29rPC9zcGFuPlwiICtcblx0XHRcdFx0XCI8L2E+XCIgK1xuXHRcdFx0XHQnPGEgY2xhc3M9XCJmYW5jeWJveC1zaGFyZV9fYnV0dG9uIGZhbmN5Ym94LXNoYXJlX19idXR0b24tLXR3XCIgaHJlZj1cImh0dHBzOi8vdHdpdHRlci5jb20vaW50ZW50L3R3ZWV0P3VybD17e3VybH19JnRleHQ9e3tkZXNjcn19XCI+JyArXG5cdFx0XHRcdCc8c3ZnIHZpZXdCb3g9XCIwIDAgNTEyIDUxMlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cGF0aCBkPVwibTQ1NiAxMzNjLTE0IDctMzEgMTEtNDcgMTMgMTctMTAgMzAtMjcgMzctNDYtMTUgMTAtMzQgMTYtNTIgMjAtNjEtNjItMTU3LTctMTQxIDc1LTY4LTMtMTI5LTM1LTE2OS04NS0yMiAzNy0xMSA4NiAyNiAxMDktMTMgMC0yNi00LTM3LTkgMCAzOSAyOCA3MiA2NSA4MC0xMiAzLTI1IDQtMzcgMiAxMCAzMyA0MSA1NyA3NyA1Ny00MiAzMC03NyAzOC0xMjIgMzQgMTcwIDExMSAzNzgtMzIgMzU5LTIwOCAxNi0xMSAzMC0yNSA0MS00MnpcIiAvPjwvc3ZnPicgK1xuXHRcdFx0XHRcIjxzcGFuPlR3aXR0ZXI8L3NwYW4+XCIgK1xuXHRcdFx0XHRcIjwvYT5cIiArXG5cdFx0XHRcdCc8YSBjbGFzcz1cImZhbmN5Ym94LXNoYXJlX19idXR0b24gZmFuY3lib3gtc2hhcmVfX2J1dHRvbi0tcHRcIiBocmVmPVwiaHR0cHM6Ly93d3cucGludGVyZXN0LmNvbS9waW4vY3JlYXRlL2J1dHRvbi8/dXJsPXt7dXJsfX0mZGVzY3JpcHRpb249e3tkZXNjcn19Jm1lZGlhPXt7bWVkaWF9fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB2aWV3Qm94PVwiMCAwIDUxMiA1MTJcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIm0yNjUgNTZjLTEwOSAwLTE2NCA3OC0xNjQgMTQ0IDAgMzkgMTUgNzQgNDcgODcgNSAyIDEwIDAgMTItNWw0LTE5YzItNiAxLTgtMy0xMy05LTExLTE1LTI1LTE1LTQ1IDAtNTggNDMtMTEwIDExMy0xMTAgNjIgMCA5NiAzOCA5NiA4OCAwIDY3LTMwIDEyMi03MyAxMjItMjQgMC00Mi0xOS0zNi00NCA2LTI5IDIwLTYwIDIwLTgxIDAtMTktMTAtMzUtMzEtMzUtMjUgMC00NCAyNi00NCA2MCAwIDIxIDcgMzYgNyAzNmwtMzAgMTI1Yy04IDM3LTEgODMgMCA4NyAwIDMgNCA0IDUgMiAyLTMgMzItMzkgNDItNzVsMTYtNjRjOCAxNiAzMSAyOSA1NiAyOSA3NCAwIDEyNC02NyAxMjQtMTU3IDAtNjktNTgtMTMyLTE0Ni0xMzJ6XCIgZmlsbD1cIiNmZmZcIi8+PC9zdmc+JyArXG5cdFx0XHRcdFwiPHNwYW4+UGludGVyZXN0PC9zcGFuPlwiICtcblx0XHRcdFx0XCI8L2E+XCIgK1xuXHRcdFx0XHRcIjwvcD5cIiArXG5cdFx0XHRcdCc8cD48aW5wdXQgY2xhc3M9XCJmYW5jeWJveC1zaGFyZV9faW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwie3t1cmxfcmF3fX1cIiBvbmNsaWNrPVwic2VsZWN0KClcIiAvPjwvcD4nICtcblx0XHRcdFx0XCI8L2Rpdj5cIlxuXHRcdH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gZXNjYXBlSHRtbChzdHJpbmcpIHtcblx0XHR2YXIgZW50aXR5TWFwID0ge1xuXHRcdFx0XCImXCI6IFwiJmFtcDtcIixcblx0XHRcdFwiPFwiOiBcIiZsdDtcIixcblx0XHRcdFwiPlwiOiBcIiZndDtcIixcblx0XHRcdCdcIic6IFwiJnF1b3Q7XCIsXG5cdFx0XHRcIidcIjogXCImIzM5O1wiLFxuXHRcdFx0XCIvXCI6IFwiJiN4MkY7XCIsXG5cdFx0XHRcImBcIjogXCImI3g2MDtcIixcblx0XHRcdFwiPVwiOiBcIiYjeDNEO1wiXG5cdFx0fTtcblxuXHRcdHJldHVybiBTdHJpbmcoc3RyaW5nKS5yZXBsYWNlKC9bJjw+XCInYD1cXC9dL2csIGZ1bmN0aW9uKHMpIHtcblx0XHRcdHJldHVybiBlbnRpdHlNYXBbc107XG5cdFx0fSk7XG5cdH1cblxuXHQkKGRvY3VtZW50KS5vbihcImNsaWNrXCIsIFwiW2RhdGEtZmFuY3lib3gtc2hhcmVdXCIsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpbnN0YW5jZSA9ICQuZmFuY3lib3guZ2V0SW5zdGFuY2UoKSxcblx0XHRcdGN1cnJlbnQgPSBpbnN0YW5jZS5jdXJyZW50IHx8IG51bGwsXG5cdFx0XHR1cmwsXG5cdFx0XHR0cGw7XG5cblx0XHRpZiAoIWN1cnJlbnQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoJC50eXBlKGN1cnJlbnQub3B0cy5zaGFyZS51cmwpID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHVybCA9IGN1cnJlbnQub3B0cy5zaGFyZS51cmwuYXBwbHkoY3VycmVudCwgW2luc3RhbmNlLCBjdXJyZW50XSk7XG5cdFx0fVxuXG5cdFx0dHBsID0gY3VycmVudC5vcHRzLnNoYXJlLnRwbFxuXHRcdFx0LnJlcGxhY2UoL1xce1xce21lZGlhXFx9XFx9L2csIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiID8gZW5jb2RlVVJJQ29tcG9uZW50KGN1cnJlbnQuc3JjKSA6IFwiXCIpXG5cdFx0XHQucmVwbGFjZSgvXFx7XFx7dXJsXFx9XFx9L2csIGVuY29kZVVSSUNvbXBvbmVudCh1cmwpKVxuXHRcdFx0LnJlcGxhY2UoL1xce1xce3VybF9yYXdcXH1cXH0vZywgZXNjYXBlSHRtbCh1cmwpKVxuXHRcdFx0LnJlcGxhY2UoL1xce1xce2Rlc2NyXFx9XFx9L2csIGluc3RhbmNlLiRjYXB0aW9uID8gZW5jb2RlVVJJQ29tcG9uZW50KGluc3RhbmNlLiRjYXB0aW9uLnRleHQoKSkgOiBcIlwiKTtcblxuXHRcdCQuZmFuY3lib3gub3Blbih7XG5cdFx0XHRzcmM6IGluc3RhbmNlLnRyYW5zbGF0ZShpbnN0YW5jZSwgdHBsKSxcblx0XHRcdHR5cGU6IFwiaHRtbFwiLFxuXHRcdFx0b3B0czoge1xuXHRcdFx0XHR0b3VjaDogZmFsc2UsXG5cdFx0XHRcdGFuaW1hdGlvbkVmZmVjdDogZmFsc2UsXG5cdFx0XHRcdGFmdGVyTG9hZDogZnVuY3Rpb24oc2hhcmVJbnN0YW5jZSwgc2hhcmVDdXJyZW50KSB7XG5cdFx0XHRcdFx0Ly8gQ2xvc2Ugc2VsZiBpZiBwYXJlbnQgaW5zdGFuY2UgaXMgY2xvc2luZ1xuXHRcdFx0XHRcdGluc3RhbmNlLiRyZWZzLmNvbnRhaW5lci5vbmUoXCJiZWZvcmVDbG9zZS5mYlwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHNoYXJlSW5zdGFuY2UuY2xvc2UobnVsbCwgMCk7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQvLyBPcGVuaW5nIGxpbmtzIGluIGEgcG9wdXAgd2luZG93XG5cdFx0XHRcdFx0c2hhcmVDdXJyZW50LiRjb250ZW50LmZpbmQoXCIuZmFuY3lib3gtc2hhcmVfX2J1dHRvblwiKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5vcGVuKHRoaXMuaHJlZiwgXCJTaGFyZVwiLCBcIndpZHRoPTU1MCwgaGVpZ2h0PTQ1MFwiKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bW9iaWxlOiB7XG5cdFx0XHRcdFx0YXV0b0ZvY3VzOiBmYWxzZVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xufSkoZG9jdW1lbnQsIGpRdWVyeSk7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vL1xuLy8gSGFzaFxuLy8gRW5hYmxlcyBsaW5raW5nIHRvIGVhY2ggbW9kYWxcbi8vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuKGZ1bmN0aW9uKHdpbmRvdywgZG9jdW1lbnQsICQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0Ly8gU2ltcGxlICQuZXNjYXBlU2VsZWN0b3IgcG9seWZpbGwgKGZvciBqUXVlcnkgcHJpb3IgdjMpXG5cdGlmICghJC5lc2NhcGVTZWxlY3Rvcikge1xuXHRcdCQuZXNjYXBlU2VsZWN0b3IgPSBmdW5jdGlvbihzZWwpIHtcblx0XHRcdHZhciByY3NzZXNjYXBlID0gLyhbXFwwLVxceDFmXFx4N2ZdfF4tP1xcZCl8Xi0kfFteXFx4ODAtXFx1RkZGRlxcdy1dL2c7XG5cdFx0XHR2YXIgZmNzc2VzY2FwZSA9IGZ1bmN0aW9uKGNoLCBhc0NvZGVQb2ludCkge1xuXHRcdFx0XHRpZiAoYXNDb2RlUG9pbnQpIHtcblx0XHRcdFx0XHQvLyBVKzAwMDAgTlVMTCBiZWNvbWVzIFUrRkZGRCBSRVBMQUNFTUVOVCBDSEFSQUNURVJcblx0XHRcdFx0XHRpZiAoY2ggPT09IFwiXFwwXCIpIHtcblx0XHRcdFx0XHRcdHJldHVybiBcIlxcdUZGRkRcIjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBDb250cm9sIGNoYXJhY3RlcnMgYW5kIChkZXBlbmRlbnQgdXBvbiBwb3NpdGlvbikgbnVtYmVycyBnZXQgZXNjYXBlZCBhcyBjb2RlIHBvaW50c1xuXHRcdFx0XHRcdHJldHVybiBjaC5zbGljZSgwLCAtMSkgKyBcIlxcXFxcIiArIGNoLmNoYXJDb2RlQXQoY2gubGVuZ3RoIC0gMSkudG9TdHJpbmcoMTYpICsgXCIgXCI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBPdGhlciBwb3RlbnRpYWxseS1zcGVjaWFsIEFTQ0lJIGNoYXJhY3RlcnMgZ2V0IGJhY2tzbGFzaC1lc2NhcGVkXG5cdFx0XHRcdHJldHVybiBcIlxcXFxcIiArIGNoO1xuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuIChzZWwgKyBcIlwiKS5yZXBsYWNlKHJjc3Nlc2NhcGUsIGZjc3Nlc2NhcGUpO1xuXHRcdH07XG5cdH1cblxuXHQvLyBHZXQgaW5mbyBhYm91dCBnYWxsZXJ5IG5hbWUgYW5kIGN1cnJlbnQgaW5kZXggZnJvbSB1cmxcblx0ZnVuY3Rpb24gcGFyc2VVcmwoKSB7XG5cdFx0dmFyIGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHIoMSksXG5cdFx0XHRyZXogPSBoYXNoLnNwbGl0KFwiLVwiKSxcblx0XHRcdGluZGV4ID0gcmV6Lmxlbmd0aCA+IDEgJiYgL15cXCs/XFxkKyQvLnRlc3QocmV6W3Jlei5sZW5ndGggLSAxXSkgPyBwYXJzZUludChyZXoucG9wKC0xKSwgMTApIHx8IDEgOiAxLFxuXHRcdFx0Z2FsbGVyeSA9IHJlei5qb2luKFwiLVwiKTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRoYXNoOiBoYXNoLFxuXHRcdFx0LyogSW5kZXggaXMgc3RhcnRpbmcgZnJvbSAxICovXG5cdFx0XHRpbmRleDogaW5kZXggPCAxID8gMSA6IGluZGV4LFxuXHRcdFx0Z2FsbGVyeTogZ2FsbGVyeVxuXHRcdH07XG5cdH1cblxuXHQvLyBUcmlnZ2VyIGNsaWNrIGV2bnQgb24gbGlua3MgdG8gb3BlbiBuZXcgZmFuY3lCb3ggaW5zdGFuY2Vcblx0ZnVuY3Rpb24gdHJpZ2dlckZyb21VcmwodXJsKSB7XG5cdFx0aWYgKHVybC5nYWxsZXJ5ICE9PSBcIlwiKSB7XG5cdFx0XHQvLyBJZiB3ZSBjYW4gZmluZCBlbGVtZW50IG1hdGNoaW5nICdkYXRhLWZhbmN5Ym94JyBhdHJpYnV0ZSxcblx0XHRcdC8vIHRoZW4gdHJpZ2dlcmluZyBjbGljayBldmVudCBzaG91bGQgc3RhcnQgZmFuY3lCb3hcblx0XHRcdCQoXCJbZGF0YS1mYW5jeWJveD0nXCIgKyAkLmVzY2FwZVNlbGVjdG9yKHVybC5nYWxsZXJ5KSArIFwiJ11cIilcblx0XHRcdFx0LmVxKHVybC5pbmRleCAtIDEpXG5cdFx0XHRcdC5mb2N1cygpXG5cdFx0XHRcdC50cmlnZ2VyKFwiY2xpY2suZmItc3RhcnRcIik7XG5cdFx0fVxuXHR9XG5cblx0Ly8gR2V0IGdhbGxlcnkgbmFtZSBmcm9tIGN1cnJlbnQgaW5zdGFuY2Vcblx0ZnVuY3Rpb24gZ2V0R2FsbGVyeUlEKGluc3RhbmNlKSB7XG5cdFx0dmFyIG9wdHMsIHJldDtcblxuXHRcdGlmICghaW5zdGFuY2UpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRvcHRzID0gaW5zdGFuY2UuY3VycmVudCA/IGluc3RhbmNlLmN1cnJlbnQub3B0cyA6IGluc3RhbmNlLm9wdHM7XG5cdFx0cmV0ID0gb3B0cy5oYXNoIHx8IChvcHRzLiRvcmlnID8gb3B0cy4kb3JpZy5kYXRhKFwiZmFuY3lib3hcIikgfHwgb3B0cy4kb3JpZy5kYXRhKFwiZmFuY3lib3gtdHJpZ2dlclwiKSA6IFwiXCIpO1xuXG5cdFx0cmV0dXJuIHJldCA9PT0gXCJcIiA/IGZhbHNlIDogcmV0O1xuXHR9XG5cblx0Ly8gU3RhcnQgd2hlbiBET00gYmVjb21lcyByZWFkeVxuXHQkKGZ1bmN0aW9uKCkge1xuXHRcdC8vIENoZWNrIGlmIHVzZXIgaGFzIGRpc2FibGVkIHRoaXMgbW9kdWxlXG5cdFx0aWYgKCQuZmFuY3lib3guZGVmYXVsdHMuaGFzaCA9PT0gZmFsc2UpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgaGFzaCB3aGVuIG9wZW5pbmcvY2xvc2luZyBmYW5jeUJveFxuXHRcdCQoZG9jdW1lbnQpLm9uKHtcblx0XHRcdFwib25Jbml0LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlKSB7XG5cdFx0XHRcdHZhciB1cmwsIGdhbGxlcnk7XG5cblx0XHRcdFx0aWYgKGluc3RhbmNlLmdyb3VwW2luc3RhbmNlLmN1cnJJbmRleF0ub3B0cy5oYXNoID09PSBmYWxzZSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHVybCA9IHBhcnNlVXJsKCk7XG5cdFx0XHRcdGdhbGxlcnkgPSBnZXRHYWxsZXJ5SUQoaW5zdGFuY2UpO1xuXG5cdFx0XHRcdC8vIE1ha2Ugc3VyZSBnYWxsZXJ5IHN0YXJ0IGluZGV4IG1hdGNoZXMgaW5kZXggZnJvbSBoYXNoXG5cdFx0XHRcdGlmIChnYWxsZXJ5ICYmIHVybC5nYWxsZXJ5ICYmIGdhbGxlcnkgPT0gdXJsLmdhbGxlcnkpIHtcblx0XHRcdFx0XHRpbnN0YW5jZS5jdXJySW5kZXggPSB1cmwuaW5kZXggLSAxO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRcImJlZm9yZVNob3cuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGN1cnJlbnQsIGZpcnN0UnVuKSB7XG5cdFx0XHRcdHZhciBnYWxsZXJ5O1xuXG5cdFx0XHRcdGlmICghY3VycmVudCB8fCBjdXJyZW50Lm9wdHMuaGFzaCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBDaGVjayBpZiBuZWVkIHRvIHVwZGF0ZSB3aW5kb3cgaGFzaFxuXHRcdFx0XHRnYWxsZXJ5ID0gZ2V0R2FsbGVyeUlEKGluc3RhbmNlKTtcblxuXHRcdFx0XHRpZiAoIWdhbGxlcnkpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBWYXJpYWJsZSBjb250YWluaW5nIGxhc3QgaGFzaCB2YWx1ZSBzZXQgYnkgZmFuY3lCb3hcblx0XHRcdFx0Ly8gSXQgd2lsbCBiZSB1c2VkIHRvIGRldGVybWluZSBpZiBmYW5jeUJveCBuZWVkcyB0byBjbG9zZSBhZnRlciBoYXNoIGNoYW5nZSBpcyBkZXRlY3RlZFxuXHRcdFx0XHRpbnN0YW5jZS5jdXJyZW50SGFzaCA9IGdhbGxlcnkgKyAoaW5zdGFuY2UuZ3JvdXAubGVuZ3RoID4gMSA/IFwiLVwiICsgKGN1cnJlbnQuaW5kZXggKyAxKSA6IFwiXCIpO1xuXG5cdFx0XHRcdC8vIElmIGN1cnJlbnQgaGFzaCBpcyB0aGUgc2FtZSAodGhpcyBpbnN0YW5jZSBtb3N0IGxpa2VseSBpcyBvcGVuZWQgYnkgaGFzaGNoYW5nZSksIHRoZW4gZG8gbm90aGluZ1xuXHRcdFx0XHRpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT09IFwiI1wiICsgaW5zdGFuY2UuY3VycmVudEhhc2gpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoZmlyc3RSdW4gJiYgIWluc3RhbmNlLm9yaWdIYXNoKSB7XG5cdFx0XHRcdFx0aW5zdGFuY2Uub3JpZ0hhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChpbnN0YW5jZS5oYXNoVGltZXIpIHtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQoaW5zdGFuY2UuaGFzaFRpbWVyKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFVwZGF0ZSBoYXNoXG5cdFx0XHRcdGluc3RhbmNlLmhhc2hUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKFwicmVwbGFjZVN0YXRlXCIgaW4gd2luZG93Lmhpc3RvcnkpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5oaXN0b3J5W2ZpcnN0UnVuID8gXCJwdXNoU3RhdGVcIiA6IFwicmVwbGFjZVN0YXRlXCJdKFxuXHRcdFx0XHRcdFx0XHR7fSxcblx0XHRcdFx0XHRcdFx0ZG9jdW1lbnQudGl0bGUsXG5cdFx0XHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKyBcIiNcIiArIGluc3RhbmNlLmN1cnJlbnRIYXNoXG5cdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0XHRpZiAoZmlyc3RSdW4pIHtcblx0XHRcdFx0XHRcdFx0aW5zdGFuY2UuaGFzQ3JlYXRlZEhpc3RvcnkgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaGFzaCA9IGluc3RhbmNlLmN1cnJlbnRIYXNoO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGluc3RhbmNlLmhhc2hUaW1lciA9IG51bGw7XG5cdFx0XHRcdH0sIDMwMCk7XG5cdFx0XHR9LFxuXG5cdFx0XHRcImJlZm9yZUNsb3NlLmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBjdXJyZW50KSB7XG5cdFx0XHRcdGlmIChjdXJyZW50Lm9wdHMuaGFzaCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjbGVhclRpbWVvdXQoaW5zdGFuY2UuaGFzaFRpbWVyKTtcblxuXHRcdFx0XHQvLyBHb3RvIHByZXZpb3VzIGhpc3RvcnkgZW50cnlcblx0XHRcdFx0aWYgKGluc3RhbmNlLmN1cnJlbnRIYXNoICYmIGluc3RhbmNlLmhhc0NyZWF0ZWRIaXN0b3J5KSB7XG5cdFx0XHRcdFx0d2luZG93Lmhpc3RvcnkuYmFjaygpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGluc3RhbmNlLmN1cnJlbnRIYXNoKSB7XG5cdFx0XHRcdFx0aWYgKFwicmVwbGFjZVN0YXRlXCIgaW4gd2luZG93Lmhpc3RvcnkpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKyAoaW5zdGFuY2Uub3JpZ0hhc2ggfHwgXCJcIikpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaGFzaCA9IGluc3RhbmNlLm9yaWdIYXNoO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGluc3RhbmNlLmN1cnJlbnRIYXNoID0gbnVsbDtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIENoZWNrIGlmIG5lZWQgdG8gc3RhcnQvY2xvc2UgYWZ0ZXIgdXJsIGhhcyBjaGFuZ2VkXG5cdFx0JCh3aW5kb3cpLm9uKFwiaGFzaGNoYW5nZS5mYlwiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB1cmwgPSBwYXJzZVVybCgpLFxuXHRcdFx0XHRmYiA9IG51bGw7XG5cblx0XHRcdC8vIEZpbmQgbGFzdCBmYW5jeUJveCBpbnN0YW5jZSB0aGF0IGhhcyBcImhhc2hcIlxuXHRcdFx0JC5lYWNoKFxuXHRcdFx0XHQkKFwiLmZhbmN5Ym94LWNvbnRhaW5lclwiKVxuXHRcdFx0XHRcdC5nZXQoKVxuXHRcdFx0XHRcdC5yZXZlcnNlKCksXG5cdFx0XHRcdGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuXHRcdFx0XHRcdHZhciB0bXAgPSAkKHZhbHVlKS5kYXRhKFwiRmFuY3lCb3hcIik7XG5cblx0XHRcdFx0XHRpZiAodG1wICYmIHRtcC5jdXJyZW50SGFzaCkge1xuXHRcdFx0XHRcdFx0ZmIgPSB0bXA7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXG5cdFx0XHRpZiAoZmIpIHtcblx0XHRcdFx0Ly8gTm93LCBjb21wYXJlIGhhc2ggdmFsdWVzXG5cdFx0XHRcdGlmIChmYi5jdXJyZW50SGFzaCAhPT0gdXJsLmdhbGxlcnkgKyBcIi1cIiArIHVybC5pbmRleCAmJiAhKHVybC5pbmRleCA9PT0gMSAmJiBmYi5jdXJyZW50SGFzaCA9PSB1cmwuZ2FsbGVyeSkpIHtcblx0XHRcdFx0XHRmYi5jdXJyZW50SGFzaCA9IG51bGw7XG5cblx0XHRcdFx0XHRmYi5jbG9zZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKHVybC5nYWxsZXJ5ICE9PSBcIlwiKSB7XG5cdFx0XHRcdHRyaWdnZXJGcm9tVXJsKHVybCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBDaGVjayBjdXJyZW50IGhhc2ggYW5kIHRyaWdnZXIgY2xpY2sgZXZlbnQgb24gbWF0Y2hpbmcgZWxlbWVudCB0byBzdGFydCBmYW5jeUJveCwgaWYgbmVlZGVkXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdGlmICghJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpKSB7XG5cdFx0XHRcdHRyaWdnZXJGcm9tVXJsKHBhcnNlVXJsKCkpO1xuXHRcdFx0fVxuXHRcdH0sIDUwKTtcblx0fSk7XG59KSh3aW5kb3csIGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIFdoZWVsXG4vLyBCYXNpYyBtb3VzZSB3ZWhlZWwgc3VwcG9ydCBmb3IgZ2FsbGVyeSBuYXZpZ2F0aW9uXG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbihkb2N1bWVudCwgJCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHR2YXIgcHJldlRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuXHQkKGRvY3VtZW50KS5vbih7XG5cdFx0XCJvbkluaXQuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGN1cnJlbnQpIHtcblx0XHRcdGluc3RhbmNlLiRyZWZzLnN0YWdlLm9uKFwibW91c2V3aGVlbCBET01Nb3VzZVNjcm9sbCB3aGVlbCBNb3pNb3VzZVBpeGVsU2Nyb2xsXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIGN1cnJlbnQgPSBpbnN0YW5jZS5jdXJyZW50LFxuXHRcdFx0XHRcdGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cblx0XHRcdFx0aWYgKGluc3RhbmNlLmdyb3VwLmxlbmd0aCA8IDIgfHwgY3VycmVudC5vcHRzLndoZWVsID09PSBmYWxzZSB8fCAoY3VycmVudC5vcHRzLndoZWVsID09PSBcImF1dG9cIiAmJiBjdXJyZW50LnR5cGUgIT09IFwiaW1hZ2VcIikpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cblx0XHRcdFx0aWYgKGN1cnJlbnQuJHNsaWRlLmhhc0NsYXNzKFwiZmFuY3lib3gtYW5pbWF0ZWRcIikpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlID0gZS5vcmlnaW5hbEV2ZW50IHx8IGU7XG5cblx0XHRcdFx0aWYgKGN1cnJUaW1lIC0gcHJldlRpbWUgPCAyNTApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRwcmV2VGltZSA9IGN1cnJUaW1lO1xuXG5cdFx0XHRcdGluc3RhbmNlWygtZS5kZWx0YVkgfHwgLWUuZGVsdGFYIHx8IGUud2hlZWxEZWx0YSB8fCAtZS5kZXRhaWwpIDwgMCA/IFwibmV4dFwiIDogXCJwcmV2aW91c1wiXSgpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcbn0pKGRvY3VtZW50LCBqUXVlcnkpO1xuXG4oZnVuY3Rpb24gKCQpIHtcblx0JChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuXHRcdGFwcC5pbml0KCk7XG5cdH0pO1xuXG5cdHZhciBhcHAgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dGhpcy5hY2Nlc3NpYmlsaXR5KCk7XG5cdFx0XHR0aGlzLnV0aWxzKCk7XG5cdFx0XHQvLyB0aGlzLmFnZW5kYSgpO1xuXHRcdFx0dGhpcy5tZW51KCk7XG5cdFx0XHRjb25zb2xlLmxvZygnQXBwIGhlcmUhICcpO1xuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKiBBY2Nlc3NpYmlsaXR5IGZ1bmN0aW9uc1xuXHRcdCAqXG5cdFx0ICovXG5cdFx0YWNjZXNzaWJpbGl0eTogZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gSGlnaCBjb250cmFzdFxuXHRcdFx0JCgnI2hpZ2gtY29udHJhc3QtYnRuJykuY2xpY2soZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR2YXIgaGlnaENvbnRyYXN0ID0gY29va2llKCdoaWdoLWNvbnRyYXN0Jyk7XG5cblx0XHRcdFx0aWYgKGhpZ2hDb250cmFzdCA9PT0gJ29uJykge1xuXHRcdFx0XHRcdGNvb2tpZSgnaGlnaC1jb250cmFzdCcsICdvZmYnKTtcblx0XHRcdFx0XHQkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2hpZ2gtY29udHJhc3QnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb29raWUoJ2hpZ2gtY29udHJhc3QnLCAnb24nKTtcblx0XHRcdFx0XHQkKCdib2R5JykuYWRkQ2xhc3MoJ2hpZ2gtY29udHJhc3QnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogTWVudSBGdW5jdGlvbnNcblx0XHQgKlxuXHRcdCAqL1xuXHRcdG1lbnU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIEhpZ2ggY29udHJhc3Rcblx0XHRcdCQoJyNtZW51LXRvZ2dsZScpLmNsaWNrKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0JCgnYm9keScpLnRvZ2dsZUNsYXNzKCdtZW51LWFjdGl2ZScpO1xuXHRcdFx0fSlcblxuXHRcdFx0JCgnI21lbnUtd3JhcHBlciwgI21lbnUtdG9nZ2xlJykuY2xpY2soZnVuY3Rpb24oZXZlbnQpe1xuXHRcdFx0XHQvLyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKCcjbWFpbi1oZWFkZXInKS5jbGljayhmdW5jdGlvbihldmVudCl7XG5cdFx0XHRcdCQoJ2JvZHknKS5yZW1vdmVDbGFzcygnbWVudS1hY3RpdmUnKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKCcud2lkZ2V0X25hdl9tZW51JykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQodGhpcykudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIFV0aWxpdHkgZnVuY3Rpb25zLCB1c2VkIG9uIGFsbCBzaXRlc1xuXHRcdCAqXG5cdFx0ICovXG5cdFx0dXRpbHM6IGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIEVuYWJsZSBib290c3RyYXAgdG9vbHRpcFxuXHRcdFx0JCgnW2RhdGEtdG9nZ2xlPVwidG9vbHRpcFwiXScpLnRvb2x0aXAoKTtcblxuXHRcdFx0Ly8gRmFuY3lib3ggZm9yIGdhbGxlcnkgbWVkaWFcblx0XHRcdGlmKCAkKCcuZ2FsbGVyeScpLmxlbmd0aCApe1xuXHRcdFx0XHQkKCcuZ2FsbGVyeS1pdGVtJykuZWFjaCggZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHZhciBjYXB0aW9uID0gJCh0aGlzKS5maW5kKCcuZ2FsbGVyeS1jYXB0aW9uJykudGV4dCgpO1xuXHRcdFx0XHRcdCQodGhpcykuZmluZCgnYScpLmF0dHIoICdkYXRhLWNhcHRpb24nLCBjYXB0aW9uICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCcuZ2FsbGVyeS1pdGVtIGEnKS5hdHRyKCAnZGF0YS1mYW5jeWJveCcsICdncm91cCcgKTtcblx0XHRcdFx0JCgnLmdhbGxlcnktaXRlbSBhJykuZmFuY3lib3goe30pO1xuXHRcdFx0fVxuXG5cdFx0XHQkKCcudG9nZ2xlLWFjdGl2ZScpLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCh0aGlzKS5wYXJlbnQoKS50b2dnbGVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHR9KTtcblxuXHRcdFx0JCgnYS5zaGFyZS1saW5rJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0dmFyIHVybCA9ICQodGhpcykuYXR0cignaHJlZicpO1xuXHRcdFx0XHRzaG93TW9kYWwodXJsKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRmdW5jdGlvbiBzaG93TW9kYWwodXJsKXtcblx0XHRcdFx0d2luZG93Lm9wZW4odXJsLCBcInNoYXJlV2luZG93XCIsIFwid2lkdGg9NjAwLCBoZWlnaHQ9NDAwXCIpO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHR9LFxuXG5cdFx0YWdlbmRhOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHQkKCcjZGF0ZXBpY2tlcicpLmRhdGVwaWNrZXIoe1xuXHRcdFx0XHRkYXlOYW1lc01pbjogWydEb20nLCAnU2VnJywgJ1RlcicsICdRdWEnLCAnUXVpJywgJ1NleCcsICdTYWInXVxuXHRcdFx0fSk7XG5cblx0XHRcdCQoJy5tb250aHBpY2tlcicpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0JCgnLm1vbnRocGlja2VyJykuZGF0ZXBpY2tlcignc2hvdycpO1xuXHRcdFx0fSlcblx0XHR9XG5cdH07XG59KShqUXVlcnkpO1xuIl0sImZpbGUiOiJidW5kbGUuanMifQ==
