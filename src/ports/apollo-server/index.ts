import 'reflect-metadata'
// import { join } from 'node:path'
import { ApolloServer } from 'apollo-server'
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core'
import { buildSchema } from 'type-graphql'
import { env } from '@/helpers'
import * as user from '@/ports/adapters/http/modules/user'

import { Article } from './modules/article/article.type'
import { repositories, authChecker, Context } from './server'

import { ArticleResolver } from './modules/article/article.resolver'
import { CommentResolver } from './modules/comment/comment.resolver'
import { ProfileResolver } from './modules/profile/profile.resolver'
import { TagResolver } from './modules/tag/tag.resolver'
import { UserResolver } from './modules/user/user.resolver'
import { NodeResolver } from './relay/node.resolver'
import { authMiddleware, getPayload } from '../adapters/http/http'
import * as E from 'fp-ts/Either'

const PORT = env('PORT')

export async function start() {
  const schema = await buildSchema({
    orphanedTypes: [Article],
    // resolvers: [join(__dirname, '{modules,relay}', '**', '*.resolver.ts')],
    resolvers: [
      ArticleResolver,
      CommentResolver,
      ProfileResolver,
      TagResolver,
      UserResolver,
      NodeResolver,
    ],
    // emitSchemaFile: true,
    authChecker,
  })

  const server = new ApolloServer({
    schema,
    context: async ({ req }: Context) => {
      const auth = await authMiddleware(req.header('authorization'))()
      let viewer = null
      if (E.isRight(auth)) {
        const payload = getPayload(auth.right)
        viewer = user.getCurrentUser({
          id: payload.id,
          authHeader: req.header('authorization'),
        })
      }
      return {
        viewer,
        repositories,
        req,
      }
    },
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
  })

  return server.listen({ port: PORT }).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`)
  })
}
