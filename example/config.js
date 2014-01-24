module.exports = {
	basePath: __dirname,
	bodyLimits: {
		json: '1mb',
		form: '1mb',
		text: '1mb',
		file: '5mb'
	},
	middleware: [
		{
			name: 'html-error-pages',
			object: require('./middleware/htmlErrorPages').middleware()
		},
		{
			name: 'handlebars', 
			object: require('koa-hbs').middleware({ 
				viewPath: __dirname + '/views/'
			})
		}
	],
	endpoints: [
		{ port: 4002, type: 'http' },
		//{ port: 4001, type: 'https' }
	]
};
