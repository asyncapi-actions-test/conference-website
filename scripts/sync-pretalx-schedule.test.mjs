import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  mapPretalxEventsToCities,
  mapPretalxSchedule,
  mergePretalxSchedules,
  readJson,
  syncPretalxData,
  writeJson,
} from './sync-pretalx-schedule.mjs';

test('maps public Pretalx events into generated website cities', async () => {
  const events = JSON.parse(
    await readFile(new URL('./fixtures/pretalx-events.json', import.meta.url))
  );

  const cities = mapPretalxEventsToCities(events.results, {
    baseUrl: 'https://pretalx.test',
  });

  assert.deepEqual(cities, [
    {
      name: 'Online',
      country: ' Edition',
      date: '28 October, 2026',
      cfpDate: 'Not announced yet',
      description:
        'Join us for AsyncAPI Online 2026. CFP and schedule data are managed in Pretalx.',
      img: '/img/locations/teasers.webp',
      address: 'Pretalx event page',
      mapUrl: 'https://pretalx.test/asyncapi-online-2026/',
      sponsors: {
        eventSponsors: [],
      },
      freeEntry: true,
      cfp: {
        provider: 'pretalx',
        eventSlug: 'asyncapi-online-2026',
      },
      recordings: null,
      playlist: null,
    },
    {
      name: 'Unmatched Public Event',
      country: 'TBA',
      date: '1 November, 2026',
      cfpDate: 'Not announced yet',
      description:
        'Join us for Unmatched Public Event. CFP and schedule data are managed in Pretalx.',
      img: '/img/locations/teasers.webp',
      address: 'Pretalx event page',
      mapUrl: 'https://pretalx.test/unmatched-public-event/',
      sponsors: {
        eventSponsors: [],
      },
      freeEntry: true,
      cfp: {
        provider: 'pretalx',
        eventSlug: 'unmatched-public-event',
      },
      recordings: null,
      playlist: null,
    },
  ]);
});

test('maps Pretalx event metadata into website cities', async () => {
  const events = JSON.parse(
    await readFile(new URL('./fixtures/pretalx-events.json', import.meta.url))
  );

  const cities = mapPretalxEventsToCities(events.results, {
    baseUrl: 'https://pretalx.test',
    metadataBySlug: new Map([
      [
        'asyncapi-online-2026',
        {
          cfp: {
            opening: '2026-06-01T00:00:00+00:00',
            deadline: '2026-09-30T23:59:00+00:00',
            is_open: true,
          },
          location: {
            city: 'Bangalore',
            country: 'India',
            address: 'NIMHANS Convention Centre, Bangalore',
            map_url: 'https://maps.example.com/bangalore',
          },
        },
      ],
    ]),
  });

  assert.deepEqual(cities[0], {
    name: 'Bangalore',
    country: 'India',
    date: '28 October, 2026',
    cfpDate: '30 September, 2026',
    description:
      'Join us for AsyncAPI Online 2026. CFP and schedule data are managed in Pretalx.',
    img: '/img/locations/teasers.webp',
    address: 'NIMHANS Convention Centre, Bangalore',
    mapUrl: 'https://maps.example.com/bangalore',
    sponsors: {
      eventSponsors: [],
    },
    freeEntry: true,
    cfp: {
      provider: 'pretalx',
      eventSlug: 'asyncapi-online-2026',
    },
    recordings: null,
    playlist: null,
  });
});

test('maps expanded Pretalx schedule slots into website speakers and agenda', async () => {
  const fixture = JSON.parse(
    await readFile(
      new URL('./fixtures/pretalx-schedule-latest.json', import.meta.url)
    )
  );

  const result = mapPretalxSchedule(fixture, { city: 'Online' });

  assert.deepEqual(result.speakers, [
    {
      id: 1,
      name: 'Alice Example',
      title: 'Principal engineer',
      img: 'https://pretalx.test/media/avatars/alice.jpg',
      city: ['Online'],
    },
    {
      id: 2,
      name: 'Bob Example',
      title: 'Developer advocate',
      img: '/img/speaker-images/paris/TBA.webp',
      city: ['Online'],
    },
    {
      id: 3,
      name: 'Casey Example',
      title: 'Speaker',
      img: 'https://pretalx.test/media/avatars/casey.jpg',
      city: ['Online'],
    },
  ]);

  assert.deepEqual(result.agenda, [
    {
      time: '10:00 - 10:30 UTC',
      session: 'Designing Event-Driven APIs',
      speaker: 1,
      type: 'Talk',
      city: 'Online',
      day: 'Wednesday, October 28, 2026',
    },
    {
      time: '11:00 - 11:45 UTC',
      session: 'Operating AsyncAPI at Scale',
      speaker: [2, 3],
      type: 'Workshop',
      city: 'Online',
      day: 'Wednesday, October 28, 2026',
    },
  ]);
});

test('writeJson creates missing parent directories', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretalx-sync-'));
  const outputPath = join(directory, 'nested', 'speakers.json');

  try {
    await writeJson(outputPath, [{ name: 'Alice Example' }]);

    assert.deepEqual(await readJson(outputPath), [{ name: 'Alice Example' }]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('merges multiple Pretalx schedules without speaker id collisions', async () => {
  const fixture = JSON.parse(
    await readFile(
      new URL('./fixtures/pretalx-schedule-latest.json', import.meta.url)
    )
  );

  const result = mergePretalxSchedules([
    mapPretalxSchedule(fixture, { city: 'Online' }),
    mapPretalxSchedule(fixture, { city: 'Paris' }),
  ]);

  assert.equal(result.speakers.length, 6);
  assert.deepEqual(
    result.speakers.map((speaker) => speaker.id),
    [1, 2, 3, 4, 5, 6]
  );
  assert.deepEqual(result.agenda[0].speaker, 1);
  assert.deepEqual(result.agenda[1].speaker, [2, 3]);
  assert.deepEqual(result.agenda[2].speaker, 4);
  assert.deepEqual(result.agenda[3].speaker, [5, 6]);
  assert.equal(result.agenda[2].city, 'Paris');
});

test('syncPretalxData writes generated Pretalx data under config/pretalx', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretalx-sync-'));
  const events = JSON.parse(
    await readFile(new URL('./fixtures/pretalx-events.json', import.meta.url))
  );
  const schedule = JSON.parse(
    await readFile(
      new URL('./fixtures/pretalx-schedule-latest.json', import.meta.url)
    )
  );

  const fetchImpl = async (url, init) => {
    assert.equal(init.headers.Authorization, 'Token secret-token');

    const parsedUrl = new URL(url);

    if (parsedUrl.pathname === '/api/events/') {
      assert.equal(parsedUrl.searchParams.get('is_public'), 'true');
      return jsonResponse(events.results);
    }

    if (
      parsedUrl.pathname ===
      '/api/events/asyncapi-online-2026/p/asyncapi-cfp/event-info/'
    ) {
      return jsonResponse({
        event: 'asyncapi-online-2026',
        cfp: {
          opening: '2026-06-01T00:00:00+00:00',
          deadline: '2026-09-30T23:59:00+00:00',
          is_open: true,
        },
        location: {
          city: 'Online',
          country: ' Edition',
          address: 'AsyncAPI YouTube Channel',
          map_url: 'https://www.youtube.com/@AsyncAPI',
        },
      });
    }

    if (
      parsedUrl.pathname ===
      '/api/events/asyncapi-online-2026/schedules/latest/'
    ) {
      assert.deepEqual(parsedUrl.searchParams.getAll('expand'), [
        'slots.submission.speakers',
        'slots.submission.submission_type',
        'slots.submission.track',
      ]);
      return jsonResponse(schedule);
    }

    if (
      parsedUrl.pathname ===
      '/api/events/unmatched-public-event/p/asyncapi-cfp/event-info/'
    ) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      };
    }

    if (
      parsedUrl.pathname ===
      '/api/events/unmatched-public-event/schedules/latest/'
    ) {
      return jsonResponse({
        id: 2,
        version: '1.0',
        published: '2026-11-01T10:00:00Z',
        slots: [],
      });
    }

    throw new Error(`Unexpected URL ${url}`);
  };

  try {
    const result = await syncPretalxData({
      repoRoot: directory,
      baseUrl: 'https://pretalx.test',
      apiToken: 'secret-token',
      fetchImpl,
    });

    assert.equal(result.cities.length, 2);
    assert.equal(result.speakers.length, 3);
    assert.equal(result.agenda.length, 2);

    assert.deepEqual(
      await readJson(join(directory, 'config/pretalx/city-lists.json')),
      result.cities
    );
    assert.deepEqual(
      await readJson(join(directory, 'config/pretalx/speakers.json')),
      result.speakers
    );
    assert.deepEqual(
      await readJson(join(directory, 'config/pretalx/agenda.json')),
      result.agenda
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  };
}
