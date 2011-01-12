test:
	NODE_ENV=test expresso -I lib/ test/*
cov:
	NODE_ENV=test expresso -I lib --cov test/*

.PHONY: test cov
