import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pluginRoot = new URL(
  '../deploy/pretalx/plugins/pretalx_asyncapi_cfp/pretalx_asyncapi_cfp/',
  import.meta.url
);

async function readPluginFile(relativePath) {
  return readFile(new URL(relativePath, pluginRoot), 'utf8');
}

test('Pretalx plugin exposes an organizer settings link for event location', async () => {
  const appConfig = await readPluginFile('__init__.py');
  const djangoAppConfig = await readPluginFile('apps.py');
  const urls = await readPluginFile('urls.py');

  assert.match(appConfig, /PretalxPluginMeta/);
  assert.match(djangoAppConfig, /class AsyncApiCfpApiApp\(AppConfig\)/);
  assert.match(djangoAppConfig, /class PretalxPluginMeta/);
  assert.match(djangoAppConfig, /settings_links/);
  assert.match(djangoAppConfig, /asyncapi-cfp-location-settings/);
  assert.match(urls, /orga\/event/);
  assert.match(urls, /LocationSettingsView/);
});

test('Pretalx plugin package declares a discoverable entry point', async () => {
  const packageConfig = await readFile(
    new URL(
      '../deploy/pretalx/plugins/pretalx_asyncapi_cfp/pyproject.toml',
      import.meta.url
    ),
    'utf8'
  );

  assert.match(packageConfig, /\[project\.entry-points\."pretalx\.plugin"\]/);
  assert.match(
    packageConfig,
    /pretalx_asyncapi_cfp\s*=\s*"pretalx_asyncapi_cfp:PretalxPluginMeta"/
  );
  assert.match(packageConfig, /\[tool\.setuptools\.package-data\]/);
  assert.match(
    packageConfig,
    /pretalx_asyncapi_cfp\s*=\s*\[\s*"templates\/\*\*\/\*\.html"\s*\]/
  );
});

test('Pretalx compose routes HTTP through nginx for uploaded media', async () => {
  const compose = await readFile(
    new URL('../deploy/pretalx/docker-compose.yml', import.meta.url),
    'utf8'
  );
  const workflow = await readFile(
    new URL(
      '../.github/workflows/deploy-pretalx-digitalocean.yml',
      import.meta.url
    ),
    'utf8'
  );

  assert.match(compose, /nginx:/);
  assert.match(compose, /nginx-container\.conf/);
  assert.match(compose, /pretalx-public:\/public:ro/);
  assert.match(compose, /127\.0\.0\.1:\$\{PRETALX_HTTP_PORT:-8346\}:80/);
  assert.match(workflow, /deploy\/pretalx\/nginx-container\.conf/);
  assert.match(workflow, /pretalx_site_url:/);
  assert.match(workflow, /vars\.PRETALX_SITE_URL/);
  assert.doesNotMatch(workflow, /secrets\.PRETALX_SITE_URL/);
});

test('Pretalx deployment caps file uploads at a small image-friendly size', async () => {
  const configTemplate = await readFile(
    new URL('../deploy/pretalx/pretalx.cfg.template', import.meta.url),
    'utf8'
  );
  const containerNginx = await readFile(
    new URL('../deploy/pretalx/nginx-container.conf', import.meta.url),
    'utf8'
  );
  const hostNginxTemplate = await readFile(
    new URL('../deploy/pretalx/nginx.conf.template', import.meta.url),
    'utf8'
  );
  const envExample = await readFile(
    new URL('../deploy/pretalx/.env.example', import.meta.url),
    'utf8'
  );
  const workflow = await readFile(
    new URL(
      '../.github/workflows/deploy-pretalx-digitalocean.yml',
      import.meta.url
    ),
    'utf8'
  );

  assert.match(configTemplate, /\[files\]/);
  assert.match(configTemplate, /upload_limit = \$\{PRETALX_FILE_UPLOAD_LIMIT\}/);
  assert.match(envExample, /PRETALX_FILE_UPLOAD_LIMIT=2/);
  assert.match(
    workflow,
    /PRETALX_FILE_UPLOAD_LIMIT: \$\{\{ vars\.PRETALX_FILE_UPLOAD_LIMIT \|\| '2' \}\}/
  );
  assert.match(containerNginx, /client_max_body_size 3m;/);
  assert.match(hostNginxTemplate, /client_max_body_size 3m;/);
});

test('Pretalx plugin settings form persists AsyncAPI location metadata', async () => {
  const api = await readPluginFile('api.py');
  const forms = await readPluginFile('forms.py');
  const views = await readPluginFile('views.py');
  const template = await readPluginFile(
    'templates/pretalx_asyncapi_cfp/location_settings.html'
  );

  for (const field of ['city', 'country', 'address', 'map_url', 'image_url']) {
    assert.match(forms, new RegExp(`${field}\\s*=`));
  }

  assert.match(template, /for field in form/);
  assert.doesNotMatch(template, /as_field_group/);
  assert.match(forms, /asyncapi_location/);
  assert.match(forms, /landing_page_text/);
  assert.match(forms, /LazyI18nString/);
  assert.match(forms, /get_landing_page_text_by_locale/);
  assert.match(forms, /asyncapi-cfp-location:start/);
  assert.match(forms, /asyncapi-cfp-location:end/);
  assert.match(forms, /build_landing_page_location_block/);
  assert.match(forms, /event\.display_settings/);
  assert.match(api, /build_cfp_metadata/);
  assert.match(api, /image_url/);
  assert.match(api, /get_event_for_request/);
  assert.match(api, /IsAuthenticated/);
  assert.match(api, /serialize_datetime/);
  assert.doesNotMatch(api, /timezone\.now/);
  assert.doesNotMatch(api, /ApiPermission/);
  assert.match(views, /LocationSettingsForm/);
  assert.match(views, /self\.request\.event/);
});
