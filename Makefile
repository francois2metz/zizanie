test:
	NODE_ENV=test expresso -I lib/ test/*.test.js
cov:
	NODE_ENV=test expresso -I lib --cov test/*.test.js

.PHONY: test cov
