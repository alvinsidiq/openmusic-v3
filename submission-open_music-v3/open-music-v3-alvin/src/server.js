/* eslint-disable no-undef */
require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');
const Inert = require('@hapi/inert');
const path = require('path');

// Import API routes
const albums = require('./api/albums_music');
const songs = require('./api/songs_item');
const users = require('./api/users');
const authentications = require('./api/authentications');
const playlists = require('./api/playlists_music');
const collaborations = require('./api/collaborations');
const activities = require('./api/activities');
const _exports = require('./api/exports');
const uploads = require('./api/uploads');
const userAlbumLikes = require('./api/userAlbumLikes');

// Import Services
const AlbumsService = require('./service/postgres/AlbumService');
const SongsService = require('./service/postgres/SongService');
const UsersService = require('./service/postgres/UsersService');
const AuthenticationsService = require('./service/postgres/AuthenticationService');
const PlaylistsService = require('./service/postgres/PlaylistsService');
const CollaborationsService = require('./service/postgres/CollaborationService');
const ActivitiesService = require('./service/postgres/ActivityService');
const ProducerService = require('./service/rabbitmq/ProducerService');
const StorageService = require('./service/storage/StorageService');
const UserAlbumLikesService = require('./service/postgres/UserAlbumLikesService');
const CacheService = require('./service/redis/CacheService');

// Import Validators
const AlbumsValidator = require('./validator/albums');
const SongsValidator = require('./validator/songs');
const UsersValidator = require('./validator/users');
const AuthenticationsValidator = require('./validator/authentications');
const PlaylistsValidator = require('./validator/playlists');
const CollaborationsValidator = require('./validator/collaborations');
const ActivitiesValidator = require('./validator/activities');
const ExportsValidator = require('./validator/exports');
const UploadsValidator = require('./validator/uploads');

// Import Token Manager and Error Handler
const TokenManager = require('./tokenize/TokenManager');
const ClientError = require('./exception/ClientError');

const init = async () => {
  // Initialize services
  const cacheService = new CacheService(); // Initialize cacheService first
  const userAlbumLikesService = new UserAlbumLikesService(cacheService);
  const albumsService = new AlbumsService();
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const collaborationsService = new CollaborationsService(cacheService); // Use correct service name
  const playlistsService = new PlaylistsService(collaborationsService, cacheService); // Use correct service name
  const activitiesService = new ActivitiesService();
  const storageService = new StorageService(path.resolve(__dirname, 'api/uploads/file/images'));

  // Create Hapi server
  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  // Register JWT authentication plugin
  await server.register([
    {
      plugin: Jwt,
    },
    {
      plugin: Inert,
    },
  ]);

  // Define authentication strategy
  server.auth.strategy('openmusic_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  // Register API routes
  await server.register([
    {
      plugin: songs,
      options: {
        service: songsService,
        validator: SongsValidator,
      },
    },
    {
      plugin: albums,
      options: {
        service: albumsService,
        validator: AlbumsValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService,
        playlistsService,
        validator: CollaborationsValidator,
      },
    },
    {
      plugin: activities,
      options: {
        service: activitiesService,
        validator: ActivitiesValidator,
      },
    },
    {
      plugin: _exports,
      options: {
        service: ProducerService,
        validator: ExportsValidator,
        playlistsService,
      },
    },
    {
      plugin: uploads,
      options: {
        service: storageService,
        validator: UploadsValidator,
      },
    },
    {
      plugin: userAlbumLikes,
      options: {
        userAlbumLikesService,
        service: albumsService, // Corrected the service name here
      },
    },
  ]);

  // Error handling extension
  server.ext('onPreResponse', (request, h) => {
    const { response } = request;

    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    return h.continue;
  });

  // Start the server
  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();
