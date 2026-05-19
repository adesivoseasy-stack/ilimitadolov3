# Content from https://api.pay.hoopay.com.br/docs/swagger-ui-init.js

window.onload = function() {
 // Build a system
 var url = window.location.search.match(/url=(\[^&\]+)/);
 if (url && url.length > 1) {
 url = decodeURIComponent(url\[1\]);
 } else {
 url = window.location.origin;
 }
 var options = {
 "swaggerDoc": {
 "openapi": "3.0.0",
 "info": {
 "title": "Charge - HooPay Documentation",
 "description": "This is an API HooPay Platform",
 "version": "0.2.0",
 "contact": {
 "email": "ti@hoopay.com.br",
 "name": "The TI"
 }
 },
 "servers": \[\
 {\
 "description": "Local API",\
 "url": "http://localhost:3334"\
 },\
 {\
 "description": "Development API",\
 "url": "https://api.pay.dev.hoopay.com.br"\
 },\
 {\
 "description": "Production API",\
 "url": "https://api.pay.hoopay.com.br"\
 }\
 \],
 "paths": {
 "/charge": {
 "post": {
 "tags": \[\
 "Charge"\
 \],
 "summary": "Charge a payment",
 "description": "Charge a payment",
 "security": \[\
 {\
 "XApiKey": \[\]\
 }\
 \],
 "parameters": \[\
 {\
 "name": "acquirer",\
 "in": "query",\
 "description": "Acquirer in Dev mode",\
 "schema": {\
 "type": "string",\
 "enum": \[\
 "pagarme",\
 "mock"\
 \]\
 }\
 }\
 \],
 "requestBody": {
 "content": {
 "application/json": {
 "schema": {
 "$ref": "#/components/schemas/payment"
 },
 "examples": {
 "default": {
 "value": {
 "url": "https://checkout.hoopay.com.br/07419044-b619-4c25-86da-4261cc530573?product\[\]=254315d6-a397-4785-83b1-000d8a93f7ae&src=other42",
 "src": "other42",
 "organizationUUID": "07419044-b619-4c25-86da-4261cc530573",
 "affiliateId": 1,
 "customer": {
 "email": "GubioBarros\_Oliveira@hotmail.com",
 "name": "Gúbio Barros",
 "phoneNumber": "61999999999",
 "document": "67106071781"
 },
 "address": {
 "zipcode": "76755-316",
 "street": "002 Gustavo Marginal",
 "streetNumber": "Suite 653",
 "neighborhood": "Gardena",
 "complement": "32085-639",
 "city": "Waldorf",
 "state": "AP"
 },
 "products": \[\
 {\
 "variantUUID": "254315d6-a397-4785-83b1-000d8a93f7ae",\
 "quantity": 1\
 }\
 \],
 "payment": {
 "type": "billet"
 },
 "ip": "192.168.0.1"
 }
 },
 "billet": {
 "value": {
 "url": "https://checkout.hoopay.com.br/c71a1241-cce2-4c1f-9e1b-681148334f0d?product\[\]=9b652a29-d87b-4ce7-95d2-0a066ac29e8e&src=other42",
 "src": "other42",
 "organizationUUID": "c71a1241-cce2-4c1f-9e1b-681148334f0d",
 "affiliateId": 2,
 "customer": {
 "email": "GubioBarros\_Oliveira@hotmail.com",
 "name": "Gúbio Barros",
 "phoneNumber": "61999999999",
 "document": "67106071781"
 },
 "address": {
 "zipcode": "76755-316",
 "street": "002 Gustavo Marginal",
 "streetNumber": "Suite 653",
 "neighborhood": "Gardena",
 "complement": "32085-639",
 "city": "Waldorf",
 "state": "AP"
 },
 "products": \[\
 {\
 "variantUUID": "9b652a29-d87b-4ce7-95d2-0a066ac29e8e",\
 "quantity": 1\
 }\
 \],
 "payment": {
 "type": "billet"
 },
 "ip": "192.168.0.1"
 }
 },
 "pix": {
 "value": {
 "url": "https://checkout.hoopay.com.br/c71a1241-cce2-4c1f-9e1b-681148334f0d?product\[\]=9b652a29-d87b-4ce7-95d2-0a066ac29e8e&src=other42",
 "src": "other42",
 "organizationUUID": "c71a1241-cce2-4c1f-9e1b-681148334f0d",
 "affiliateId": 2,
 "customer": {
 "email": "GubioBarros\_Oliveira@hotmail.com",
 "name": "Gúbio Barros",
 "phoneNumber": "61999999999",
 "document": "67106071781"
 },
 "address": {
 "zipcode": "76755-316",
 "street": "002 Gustavo Marginal",
 "streetNumber": "Suite 653",
 "neighborhood": "Gardena",
 "complement": "32085-639",
 "city": "Waldorf",
 "state": "AP"
 },
 "products": \[\
 {\
 "variantUUID": "9b652a29-d87b-4ce7-95d2-0a066ac29e8e",\
 "quantity": 1\
 }\
 \],
 "payment": {
 "type": "pix"
 },
 "ip": "192.168.0.1"
 }
 }
 }
 }
 }
 },
 "responses": {
 "200": {
 "description": "OK"
 }
 }
 }
 }
 },
 "components": {
 "securitySchemes": {
 "XApiKey": {
 "type": "apiKey",
 "in": "header",
 "name": "x-api-key"
 }
 },
 "responses": {
 "500": {
 "description": "Internal Server Error",
 "content": {
 "application/json": {
 "schema": {
 "allOf": \[\
 {\
 "$ref": "#/components/schemas/Error"\
 },\
 {\
 "example": {\
 "errors": \[\
 {\
 "message": "Internal Error!",\
 "uniqueCode": "internalError"\
 }\
 \]\
 }\
 }\
 \]
 }
 }
 }
 },
 "Unauthorized": {
 "description": "UnauthorizedToken",
 "content": {
 "application/json": {
 "schema": {
 "allOf": \[\
 {\
 "$ref": "#/components/schemas/Error"\
 },\
 {\
 "example": {\
 "errors": \[\
 {\
 "message": "No token provided",\
 "uniqueCode": "TOKEN:NO\_PROVIDED"\
 }\
 \]\
 }\
 }\
 \]
 }
 }
 }
 }
 },
 "schemas": {
 "payment": {
 "type": "object",
 "properties": {
 "url": {
 "type": "string",
 "description": "URL to redirect the customer to"
 },
 "src": {
 "type": "string",
 "description": "Source of the payment",
 "example": "other42"
 },
 "organizationUUID": {
 "type": "string",
 "description": "Organization UUID"
 },
 "affiliateId": {
 "type": "integer",
 "description": "Affiliate ID"
 },
 "customer": {
 "type": "object",
 "description": "Customer information",
 "properties": {
 "email": {
 "type": "string",
 "description": "Customer email"
 },
 "name": {
 "type": "string",
 "description": "Customer name"
 },
 "phoneNumber": {
 "type": "string",
 "description": "Customer phone number"
 },
 "document": {
 "type": "string",
 "description": "Customer document"
 }
 }
 },
 "address": {
 "type": "object",
 "description": "Customer address",
 "properties": {
 "zipcode": {
 "type": "string",
 "description": "Customer zipcode"
 },
 "street": {
 "type": "string",
 "description": "Customer street"
 },
 "streetNumber": {
 "type": "string",
 "description": "Customer street number"
 },
 "neighborhood": {
 "type": "string",
 "description": "Customer neighborhood"
 },
 "complement": {
 "type": "string",
 "description": "Customer complement"
 },
 "city": {
 "type": "string",
 "description": "Customer city"
 },
 "state": {
 "type": "string",
 "description": "Customer state"
 }
 }
 },
 "products": {
 "type": "array",
 "description": "Products",
 "items": {
 "type": "object",
 "description": "Product",
 "properties": {
 "variantUUID": {
 "type": "string",
 "description": "Product variant UUID"
 },
 "quantity": {
 "type": "integer",
 "description": "Product quantity"
 }
 }
 }
 },
 "payment": {
 "type": "object",
 "description": "Payment information",
 "properties": {
 "type": {
 "type": "string",
 "description": "Payment type"
 },
 "cards": {
 "type": "array",
 "description": "Payment cards",
 "items": {
 "type": "object",
 "description": "Payment card",
 "properties": {
 "number": {
 "type": "string",
 "description": "Card number"
 },
 "holder": {
 "type": "string",
 "description": "Card holder"
 },
 "expirationDate": {
 "type": "string",
 "description": "Card expiration date"
 },
 "cvv": {
 "type": "string",
 "description": "Card cvv"
 },
 "installments": {
 "type": "integer",
 "description": "Card installments"
 },
 "amount": {
 "type": "number",
 "description": "Card amount"
 }
 }
 }
 }
 }
 },
 "ip": {
 "type": "string",
 "description": "Customer IP",
 "example": ""
 }
 }
 },
 "Error": {
 "type": "object",
 "properties": {
 "errors": {
 "type": "array",
 "items": {
 "type": "object",
 "properties": {
 "message": {
 "type": "string"
 },
 "uniqueCode": {
 "type": "string"
 }
 }
 }
 }
 }
 }
 }
 },
 "tags": \[\
 {\
 "name": "Charge",\
 "description": "Charge API Micro Service",\
 "externalDocs": {\
 "description": "See API",\
 "url": "http://api.pay.hoopay.com.br/docs"\
 }\
 }\
 \]
 },
 "customOptions": {},
 "swaggerUrl": "/docs.json"
};
 url = options.swaggerUrl \|\| url
 var urls = options.swaggerUrls
 var customOptions = options.customOptions
 var spec1 = options.swaggerDoc
 var swaggerOptions = {
 spec: spec1,
 url: url,
 urls: urls,
 dom\_id: '#swagger-ui',
 deepLinking: true,
 presets: \[\
 SwaggerUIBundle.presets.apis,\
 SwaggerUIStandalonePreset\
 \],
 plugins: \[\
 SwaggerUIBundle.plugins.DownloadUrl\
 \],
 layout: "StandaloneLayout"
 }
 for (var attrname in customOptions) {
 swaggerOptions\[attrname\] = customOptions\[attrname\];
 }
 var ui = SwaggerUIBundle(swaggerOptions)

 if (customOptions.oauth) {
 ui.initOAuth(customOptions.oauth)
 }

 if (customOptions.preauthorizeApiKey) {
 const key = customOptions.preauthorizeApiKey.authDefinitionKey;
 const value = customOptions.preauthorizeApiKey.apiKeyValue;
 if (!!key && !!value) {
 const pid = setInterval(() => {
 const authorized = ui.preauthorizeApiKey(key, value);
 if(!!authorized) clearInterval(pid);
 }, 500)

 }
 }

 if (customOptions.authAction) {
 ui.authActions.authorize(customOptions.authAction)
 }

 window.ui = ui
}