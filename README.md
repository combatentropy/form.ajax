**form.ajax** is a JavaScript library to help make forms that can use methods other
that GET and POST.

It has no dependencies besides a vendor-supported browser (IE 11+).

Its behavior is determined mainly by the form's attributes.

```html
<form class=ajax method=PATCH>
    <input name=favorite_color value=Green>
    <input type=submit>
</form>
```

When you click Submit,
this form will send an AJAX request with the HTTP method of PATCH.
The server's response will replace the inside of the form.
Therefore the server should respond with HTML (or plain text).
This library does not handle JSON at this time.

Were you to put an `action`, then the request would go there.
As it is, it defaults to the current URL.

```html
<form class=ajax method=PATCH action=/somewhere_else>
    <input name=favorite_color value=Green>
    <input type=submit>
</form>
```

With other attributes and classes,
you can also control where the response goes and
the format that the data is encoded into.

## Installation
Just include the script tag, and give a form the class of **ajax**.
The form need not exist on document load. It can be inserted later.
The script waits for the **submit** event and checks if the form has the class.


## Form Attributes

The form's behavior is partially controlled with certain attributes.

**method** can be any valid HTTP verb, or any invalid one, like CHICKEN.
XMLHttpRequest passes whatever it is given.
The library will first convert it to uppercase.

**action** can be any URL.
If unspecified, it is the current URL, as with normal forms.

**enctype** defaults to `application/x-www-form-urlencoded`,
as with normal forms. It can also be:
`multipart/form-data`, `text/plain`, or `application/json`,
in which case it follows the [proposal](https://www.w3.org/TR/html-json-forms/)
from the World Wide Web Consortium.

**target** is borrowed from classic HTML.
Normally it must specify a window or iframe.
Here, it should be a CSS selector.
If it is simply the underscore (`_`) then the response is discarded.
It is optional and usually best if left out.
The response can be controlled in other ways.


## Response Handling

When the form is submitted, it gains the class of **loading**.
You can do with it what you will, with CSS. When the response is received,
it removes the **loading** class and adds the class of **success** or **error**,
depending on the response code.


### HTTP Response Codes

A response in the 200s is considered a success.
But the exact code may change what happens next.
If the response is `201` (Created), and there is a `Location` header,
then the browser will go to that new page.
If the code is `205` (Reset Content) then the current page will reload.

Responses in the 300 range are redirects and never actually returned
as the final response code by `XMLHttpRequest`.
Instead it follows the redirects until it reaches a final one.
Responses in the 100 range normally aren't returned either.
They will either be in the 200s (success) or the 400s or 500s (error).


### Response Bodies

If the response code is not a command to go elsewhere (201) or reload the page (205),
and there is HTML or plain text returned, then the form will try to put it somewhere,
in this order:

1. If there is an error, and the form has the attribute `data-error-target`,
   then the response will go there (using `document.querySelector`).
   If the value is the underscore (`_`) then the response is discarded.
2. If the form's `target` attribute is set, then it will put the response there.
   If the value is the underscore (`_`) then the response is discarded.
3. If the HTTP status was an error, and there is an element within the form
   whose class is `ajax-error-target`, then it will put it there.
4. If there is an element within the form with a class of `ajax-target`,
   it will put it there.
5. By default, the target is the form.

It sounds complicated, but most times I recommend one of the last two:
a `div` within the form whose class is `ajax-target` or just the form itself.

If you give the form an attribute of `data-angle`,
then that affects where the response goes exactly.
By default it is `fill`, but it can also be:
`replace`, `prepend`, `append`, `before`, or `after`.


### Submit button attributes

Usually a form has just one submit button, and it doesn't have a name.
But if the button has a name, then its value is passed along with the other
form values.
If there is more than one submit button and they have names,
then only the one that is clicked has its value sent along.

A little-known feature of HTML forms is that these submit buttons can also
override form attributes, with
[attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/submit)
on the button like `formmethod`, `formaction`, `formenctype`, and `formtarget`.
This library honors those attributes and adds one more, `data-angle`.
