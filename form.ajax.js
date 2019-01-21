'use strict';

(function () {

// Element.matches polyfill for Internet Explorer
if (! Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector;
}

// Get data from form
if (! HTMLFormElement.prototype.readOut) {
    HTMLFormElement.prototype.readOut = function (submitter, enctype) {

        // https://www.w3.org/TR/html-json-forms/
        function entriesToJson(entries) {

            function parsePath(path) {

                let steps = [];
                let end = path.indexOf('[');
                if (-1 === end) { end = path.length; }
                let firstKey = path.substring(0, end);
                let failure = [{ type: 'object',  key: path,  last: true }];

                if ('' === firstKey) { return failure; }
                else {
                    path = path.substring(end);
                    let last = ('' === path);
                    steps.push({
                        type: 'object',
                        key: firstKey,
                        last: last,
                        append: false,
                    });

                    if (last) { return steps; }

                    while ('' !== path) {

                        if ('[]' === path.substring(0, 2)) {
                            steps[steps.length - 1].append = true;
                            path = path.substring(2);
                            if (0 !== path.length) { return failure; }
                            continue;
                        }

                        let matches = path.match(/^\[([^\]]+)\](.*)/);

                        if (matches) {

                            let key = matches[1],  type = 'object';

                            path = matches[2];

                            if (key.match(/^\d+$/)) {
                                key = Number(key);
                                type = 'array';
                            }

                            steps.push({ type: type,  key: key,  last: false });
                            continue;
                        }

                        return failure;
                    }

                    for (let i = 0; i < steps.length; i++) {
                        let step = steps[i];
                        if ((steps.length - 1) === i) {
                            step.last = true;
                        } else {
                            step.last = false;
                            step.nextType = steps[i + 1].type;
                        }
                    }
                }

                return steps;
            }

            function setJsonValue(context, step, currentValue, entryValue) {

                if (step.last) {
                    if ('undefined' === typeof currentValue) {
                        context[step.key] = step.append ? [ entryValue ] : entryValue;
                    } else if (Array.isArray(currentValue)) {
                        context[step.key].push(entryValue);
                    } else if ('object' === typeof currentValue) {
                        step = { type: 'object',  key: '',  last: true };
                        return setJsonValue(currentValue, step, currentValue[''], entryValue);
                    } else {
                        context[step.key] = [ currentValue, entryValue ];
                    }
                    return context;
                } else {
                    if ('undefined' === typeof currentValue) {
                        entryValue = ('array' === step.nextType) ? [] : {}
                        context[step.key] = entryValue;
                        return entryValue;
                    } else if ('object' === typeof currentValue) {
                        return context[step.key];
                    } else if (Array.isArray(currentValue)) {
                        if ('array' === step.nextType) {
                            return currentValue;
                        } else {
                            let o = {};
                            for (let i = 0; i < currentValue.length; i++) {
                                let item = currentValue[i];
                                if ('undefined' !== typeof item) { o[i] = item; }
                                else { context[step.key] = o; }
                            }
                            return o;
                        }
                    } else {
                        let o = { '': currentValue };
                        context[step.key] = o;
                        return o;
                    }
                }
            }

            let result = {};

            for (let i = 0; i < entries.length; i++) {

                let entry = entries[i],
                    entryName = entry[0],
                    entryValue = entry[1],
                    steps = parsePath(entryName),
                    context = result;

                for (let j = 0; j < steps.length; j++) {
                    let step = steps[j];
                    let currentValue = context[step.key];
                    context = setJsonValue(context, step, currentValue, entryValue);
                }
            }

            result = JSON.stringify(result);
            return result;
        }

        const form = this;
        let data = null;
        if (! submitter) { submitter = form.clickee; }

        // Named submitter, to be appended to data
        let ns = (submitter && submitter.name && submitter.name.length) ?
            submitter : null;

        enctype =
            enctype ||
            (submitter ? submitter.getAttribute('formenctype') : null) ||
            form.getAttribute('enctype') ||
            form.enctype;

        if (FormData.prototype.entries) {
            data = new FormData(form);
            if (ns) { data.append(ns.name, ns.value); }

            switch (enctype) {

                case 'application/json':
                    let entries = [];
                    for (let v of data) { entries.push(v); }
                    data = entriesToJson(entries);
                    break;

                case 'application/x-www-form-urlencoded':
                    data = new URLSearchParams(data);
                    break;

                case 'multipart/form-data':
                    // already FormData
                    break;

                case 'text/plain':
                    let q = [];
                    for (let v of data) { q.push(v.join('=')); }
                    data = q.join('\r\n');
                    break;
            }
        } else { // Internet Explorer 11
            function elementIsSerializable(el) {
                let s = (
                    el.name &&
                    'FIELDSET' !== el.tagName &&
                    ! el.matches(':disabled') &&
                    ! ~['file', 'reset'].indexOf(el.type) &&
                    ! (~['checkbox', 'radio'].indexOf(el.type) && ! el.checked)
                );

                return s;
            }

            let q = [];

            switch (enctype) {

                case 'application/json':
                    for (let i = 0; i < form.elements.length; i++) {
                        let el = form.elements[i];
                        if (elementIsSerializable(el)) {
                            q.push([ el.name, el.value ]);
                        }
                    }
                    if (ns) {
                        q.push([ ns.name, ns.value ]);
                    }
                    data = entriesToJson(q);
                    break;

                case 'application/x-www-form-urlencoded':
                    for (let i = 0; i < form.elements.length; i++) {
                        let el = form.elements[i];
                        if (elementIsSerializable(el)) {
                            q.push([
                                encodeURIComponent(el.name),
                                encodeURIComponent(el.value)
                            ].join('='));
                        }
                    }
                    if (ns) {
                        q.push([
                            encodeURIComponent(ns.name),
                            encodeURIComponent(ns.value)
                        ].join('='));
                    }
                    data = q.join('&');
                    break;

                case 'multipart/form-data':
                    data = new FormData(form);
                    if (ns) { data.append(ns.name, ns.value); }
                    break;

                case 'text/plain':
                    for (let i = 0; i < form.elements.length; i++) {
                        let el = form.elements[i];
                        if (elementIsSerializable(el)) {
                            q.push([ el.name, el.value ].join('='));
                        }
                    }
                    if (ns) { q.push([ ns.name, ns.value ].join('=')); }
                    data = q.join('\n');
                    break;
            }
        };

        return data;
    };
}

const BUTTON_SELECTOR = 'button, input[type=submit], input[type=image]';

// Some set-up, called on submit and reset
function setUp(form) {
    if (form.ajax instanceof XMLHttpRequest) { form.ajax.abort(); }
    if (form.targeted) { form.targeted.textContent = ''; }
    form.targeted = null;
    form.classList.remove('success');
    form.classList.remove('error');
    form.ajax = new XMLHttpRequest;
}

// capturing phase: some set-up
document.addEventListener('submit', function (ev) {
    const form = ev.target;
    if (form.classList.contains('ajax')) { setUp(form); }
}, true);

// bubbling phase: if untouched, then run AJAX request
document.addEventListener('submit', function (ev) {
    const form = ev.target;

    // Qualify
    if (! (
        form.classList.contains('ajax') &&
        form.ajax instanceof XMLHttpRequest
    )) { return; }

    ev.preventDefault();

    const ajax = form.ajax,
          buttons = form.querySelectorAll(BUTTON_SELECTOR);

    let method = form.getAttribute('method') || form.method,
        action = form.action,
        enctype = form.getAttribute('enctype') || form.enctype,
        target = form.target;

    // Let clicked button override form attributes
    if (form.clickee) {
        let c = form.clickee;
        method = c.getAttribute('formmethod') || method;
        enctype = c.getAttribute('formenctype') || enctype;
        target = c.formTarget || target;
        if (c.formAction !== location.href) { action = c.formAction; }
    }

    method = method.toUpperCase();

    let charset = form.acceptCharset || document.characterSet,
        contentType = enctype + '; charset=' + charset + ';';

    // Disable form until AJAX request finishes
    for (let i = 0; i < buttons.length; i++) {
        let button = buttons[i];
        if (! button.disabled) {
            // Mark the ones we disable,
            // so that later we don't enable ones that
            // for whatever reason
            // were disabled before the form was submitted.
            button.classList.add('ajax-disabled');
            button.disabled = true;
        }
    }

    form.classList.add('loading');

    // Attach handler to AJAX response,
    // but only if the onload attribute isn't set
    // (That's how you can override this default handling.
    // Or you can just supplement it with addEventListener.)
    if (! ajax.onload) {
        ajax.onload = function () {
            form.classList.remove('loading');

            //
            // Heed response code
            //

            let success = (2 === Math.floor(ajax.status / 100));

            if (success) {
                form.classList.add('success');
                switch (ajax.status) {
                    case 201: // Created
                        // Go to the address in the Location header
                        let loc = ajax.getResponseHeader('Location');
                        if (loc) { location.href = loc; }
                        break;
                    case 205: // Reset Content
                        location.reload();
                        break;
                }
            } else {
                form.classList.add('error');
            }

            for (let i = 0; i < buttons.length; i++) {
                let button = buttons[i];
                if (button.classList.contains('ajax-disabled')) {
                    button.disabled = false;
                }
            }

            //
            // Heed response text
            //

            if (ajax.responseText) {
                if (success) {
                    // form['target'], form .ajax-target, form
                    if (target) {
                        if ('_' === target) { target = null; } // drop response
                        else { target = document.querySelector(target); }
                    } else {
                        target = form.querySelector('.ajax-target');
                        if (! target) { target = form; }
                    }
                } else {
                    // form['data-error-target'], form .ajax-error-target, form['target'], form .ajax-target, form
                    if (form.dataset.errorTarget) {
                        target = form.dataset.errorTarget;
                        if ('_' === target) { target = null; } // drop response
                        else { target = document.querySelector(target); }
                    } else {
                        let errorTarget = form.querySelector('.ajax-error-target');
                        if (! errorTarget) {
                            if (target) {
                                if ('_' === target) { errorTarget = null; }
                                else { errorTarget = document.querySelector(target); }
                            } else {
                                errorTarget = form.querySelector('.ajax-target');
                                if (! errorTarget) { errorTarget = form; }
                            }
                        }
                        target = errorTarget;
                    }
                }

                if (target) {
                    let contentType = ajax.getResponseHeader('Content-Type').split(';').shift(),
                        prop = '';

                    if (target === form && 'text/html' === contentType) {
                        prop = 'outerHTML';
                    } else {
                        let props = {
                            'text/plain': 'textContent',
                            'text/html': 'innerHTML'
                        };
                        prop = props[contentType];
                    }

                    target[prop] = ajax.responseText;

                    // Save for reset
                    form.targeted = target;
                }
            }
        };
    }

    let data = form.readOut(form.clickee, enctype);

    if ('GET' === method) {
        // Strip query string
        let queryStringStart = action.indexOf('?');
        if (~queryStringStart) {
            action = action.substring(0, queryStringStart);
        }
        action += '?' + data;
        data = null;
    }

    // Send the request
    ajax.open(method, action);
    ajax.setRequestHeader('Content-Type', contentType);
    if (data) { ajax.send(data); } else { ajax.send(); }
});

document.addEventListener('reset', function (ev) {
    if (ev.target.matches('form.ajax')) {
        let form = ev.target;
        setUp(form);
        form.clickee = null;
    }
});

document.addEventListener('click', function (ev) {
    const el = ev.target;
    if (el.form && el.matches(BUTTON_SELECTOR)) { el.form.clickee = el; }
});

})();
