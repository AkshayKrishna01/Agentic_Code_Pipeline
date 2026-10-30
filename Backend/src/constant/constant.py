from sqlalchemy import URL

from ..settings.settings import settings

app_setting=settings

DB_URI = URL.create(
    "postgresql",
    username=settings.db_username,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port,
    database=settings.db_name_checkpoint,
).render_as_string(hide_password=False)

PYLINT_WORKSPACE = settings.pylint_workspace

RETRIES_LIMIT=3
