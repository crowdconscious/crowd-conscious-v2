import { getCurrentUser } from '../../../lib/auth-server'
import { supabase } from '../../../lib/supabase'
import { AnimatedCard } from '@/components/ui/UIComponents'

async function getUserCommunities(userId: string) {
  const { data, error } = await supabase
    .from('community_members')
    .select(`
      role,
      joined_at,
      community:communities (
        id,
        name,
        description,
        image_url,
        logo_url,
        member_count,
        core_values
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching user communities:', error)
    return []
  }

  return data || []
}

async function getUserImpactStats(userId: string) {
  // Get user's votes count
  const { data: votes } = await supabase
    .from('votes')
    .select('id')
    .eq('user_id', userId)

  // Get user's created content count
  const { data: content } = await supabase
    .from('community_content')
    .select('id, type')
    .eq('created_by', userId)

  return {
    votes_cast: votes?.length || 0,
    content_created: content?.length || 0,
    needs_created: content?.filter((c: any) => c.type === 'need').length || 0,
    events_created: content?.filter((c: any) => c.type === 'event').length || 0,
  }
}

export default async function ProfilePage() {
  const user = await getCurrentUser()
  
  if (!user) {
    return <div>Please log in to view your profile.</div>
  }

  const [userCommunities, impactStats] = await Promise.all([
    getUserCommunities(user.id),
    getUserImpactStats(user.id)
  ])

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-purple-700 text-white rounded-xl p-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="text-3xl">👤</span>
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {user.full_name || 'Community Member'}
            </h1>
            <p className="text-teal-100 mb-4">{user.email}</p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold">{userCommunities.length}</div>
                <div className="text-sm text-teal-200">Communities</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold">{impactStats.votes_cast}</div>
                <div className="text-sm text-teal-200">Votes Cast</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold">{impactStats.content_created}</div>
                <div className="text-sm text-teal-200">Content Created</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold">
                  {userCommunities.filter((c: any) => c.role === 'founder').length}
                </div>
                <div className="text-sm text-teal-200">Communities Founded</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Communities */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">My Communities</h2>
        
        {userCommunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userCommunities.map((membership: any) => (
              <AnimatedCard key={membership.community.id} hover>
                <a
                  href={`/communities/${membership.community.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Community Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                      {membership.community.logo_url ? (
                        <img
                          src={membership.community.logo_url}
                          alt={membership.community.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-white font-bold">
                          {membership.community.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{membership.community.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${membership.role === 'founder' ? 'bg-purple-100 text-purple-700' :
                            membership.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            'bg-teal-100 text-teal-700'}
                        `}>
                          {membership.role}
                        </span>
                        <span>•</span>
                        <span>{membership.community.member_count} members</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {membership.community.description || 'Building community impact together.'}
                  </p>

                  {/* Core Values */}
                  {membership.community.core_values?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {membership.community.core_values.slice(0, 2).map((value: string, index: number) => (
                        <span 
                          key={index}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full"
                        >
                          {value}
                        </span>
                      ))}
                      {membership.community.core_values.length > 2 && (
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
                          +{membership.community.core_values.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Joined Date */}
                  <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                    Joined {new Date(membership.joined_at).toLocaleDateString()}
                  </div>
                </a>
              </AnimatedCard>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No communities yet</h3>
            <p className="text-slate-600 mb-6">Join or create your first community to get started!</p>
            <a
              href="/communities"
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              <span>🌍</span>
              Explore Communities
            </a>
          </div>
        )}
      </div>

      {/* Impact Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Your Impact</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2">🗳️</div>
            <div className="text-lg font-bold text-slate-900">{impactStats.votes_cast}</div>
            <div className="text-sm text-slate-600">Votes Cast</div>
          </div>
          
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2">💡</div>
            <div className="text-lg font-bold text-slate-900">{impactStats.needs_created}</div>
            <div className="text-sm text-slate-600">Needs Created</div>
          </div>
          
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-lg font-bold text-slate-900">{impactStats.events_created}</div>
            <div className="text-sm text-slate-600">Events Created</div>
          </div>
          
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2">🏆</div>
            <div className="text-lg font-bold text-slate-900">{userCommunities.length}</div>
            <div className="text-sm text-slate-600">Communities Joined</div>
          </div>
        </div>
      </div>
    </div>
  )
}
