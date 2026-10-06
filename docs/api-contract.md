
Endpoint list (your API contract)
Method	Path	               Auth       Purpose
POST	/api/auth/register	no	Create account
POST	/api/auth/login 	no	Get a token
GET	/api/expenses?category_id=&from=&to=	yes	List and filter
POST	/api/expenses	yes	Create
PUT	/api/expenses/<id>	yes	Update
DELETE	/api/expenses/<id>	yes	Delete
GET	/api/expenses/export	yes	CSV download
GET/POST	/api/categories	yes	List and create
DELETE	/api/categories/<id>	yes	Delete
GET	/api/budgets?month=YYYY-MM	yes	Read budget
PUT	/api/budgets	yes	Set budget
GET	/api/reports/monthly?month=YYYY-MM	yes	Totals, by category, daily
GET	/health	no	App and database status
