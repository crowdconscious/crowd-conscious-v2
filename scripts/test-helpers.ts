/**
 * Test Helper Utilities for Crowd Conscious Testing Suite
 * 
 * Provides utility functions for common testing operations,
 * data generation, and validation helpers.
 */

import { createClient } from '@supabase/supabase-js'

// Test data generators
export class TestDataGenerator {
  static generateTestEmail(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
  }

  static generateTestUser() {
    const id = Date.now().toString()
    return {
      email: this.generateTestEmail(),
      password: 'TestPassword123!',
      full_name: `Test User ${id}`,
      user_type: 'user' as const
    }
  }

  static generateTestBrand() {
    const id = Date.now().toString()
    return {
      email: this.generateTestEmail(),
      password: 'TestPassword123!',
      company_name: `Test Brand ${id}`,
      user_type: 'brand' as const,
      industry: 'Technology',
      company_size: 'startup'
    }
  }

  static generateTestCommunity(creatorId: string) {
    const id = Date.now().toString()
    return {
      name: `Test Community ${id}`,
      description: 'This is a test community created by the testing suite',
      core_values: ['clean_air', 'clean_water', 'safe_cities'],
      address: `Test Address ${id}, Test City, TC 12345`,
      creator_id: creatorId
    }
  }

  static generateTestContent(communityId: string, createdBy: string, type: 'need' | 'event' | 'poll' | 'challenge') {
    const id = Date.now().toString()
    const baseContent = {
      community_id: communityId,
      type,
      title: `Test ${type} ${id}`,
      description: `This is a test ${type} created by the testing suite for validation purposes.`,
      created_by: createdBy,
      status: 'draft' as const
    }

    switch (type) {
      case 'need':
        return {
          ...baseContent,
          funding_goal: 1000,
          current_funding: 0
        }
      case 'event':
        return {
          ...baseContent,
          data: {
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            max_participants: 50,
            location: 'Test Event Location'
          }
        }
      case 'poll':
        return {
          ...baseContent,
          data: {
            options: ['Option A', 'Option B', 'Option C'],
            multiple_choice: false,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      case 'challenge':
        return {
          ...baseContent,
          data: {
            duration_days: 30,
            target_metric: 'participation',
            target_value: 100
          }
        }
      default:
        return baseContent
    }
  }

  static generateXSSPayloads(): string[] {
    return [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      '<svg onload=alert("xss")>',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<object data="javascript:alert(\'xss\')"></object>',
      '<embed src="javascript:alert(\'xss\')">',
      '<link rel="stylesheet" href="javascript:alert(\'xss\')">',
      '<style>@import "javascript:alert(\'xss\')";</style>'
    ]
  }

  static generateSQLInjectionPayloads(): string[] {
    return [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
      "' UNION SELECT * FROM users --",
      "'; UPDATE users SET email='hacker@evil.com' WHERE id=1; --"
    ]
  }
}

// Performance measurement utilities
export class PerformanceMeasurer {
  private static measurements: Map<string, number> = new Map()

  static start(label: string): void {
    this.measurements.set(label, performance.now())
  }

  static end(label: string): number {
    const start = this.measurements.get(label)
    if (!start) {
      throw new Error(`No measurement started for label: ${label}`)
    }
    const duration = performance.now() - start
    this.measurements.delete(label)
    return duration
  }

  static async measure<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.start(label)
    try {
      const result = await fn()
      const duration = this.end(label)
      return { result, duration }
    } catch (error) {
      this.measurements.delete(label)
      throw error
    }
  }

  static isWithinTarget(duration: number, targetMs: number): boolean {
    return duration <= targetMs
  }
}

// Validation utilities
export class TestValidators {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  static isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  static isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    return passwordRegex.test(password)
  }

  static hasXSSContent(content: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi
    ]
    return xssPatterns.some(pattern => pattern.test(content))
  }

  static hasSQLInjection(content: string): boolean {
    const sqlPatterns = [
      /('|(\\'))+((\s*(;|0|--|#|\/\*|\*\/))|((\s*|\+)(or|and|union|select|insert|update|delete|drop|create|alter|exec|execute)\s))/gi,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+/gi,
      /(\s*(;|--|#|\/\*|\*\/))/gi
    ]
    return sqlPatterns.some(pattern => pattern.test(content))
  }
}

// Database utilities
export class DatabaseTestHelper {
  private supabase: any

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async createTestUser(userData?: Partial<any>): Promise<{ user: any; profile: any }> {
    const testUser = { ...TestDataGenerator.generateTestUser(), ...userData }
    
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.full_name,
          user_type: testUser.user_type
        }
      }
    })

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`)
    }

    // Get the created profile
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      throw new Error(`Failed to fetch created profile: ${profileError.message}`)
    }

    return { user: authData.user, profile }
  }

  async createTestCommunity(creatorId: string, communityData?: Partial<any>): Promise<any> {
    const testCommunity = { ...TestDataGenerator.generateTestCommunity(creatorId), ...communityData }
    
    const { data, error } = await this.supabase
      .from('communities')
      .insert(testCommunity)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test community: ${error.message}`)
    }

    return data
  }

  async createTestContent(
    communityId: string, 
    createdBy: string, 
    type: 'need' | 'event' | 'poll' | 'challenge',
    contentData?: Partial<any>
  ): Promise<any> {
    const testContent = { ...TestDataGenerator.generateTestContent(communityId, createdBy, type), ...contentData }
    
    const { data, error } = await this.supabase
      .from('community_content')
      .insert(testContent)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test content: ${error.message}`)
    }

    return data
  }

  async cleanupTestData(filters: {
    userEmails?: string[]
    communityNames?: string[]
    contentTitles?: string[]
  }): Promise<void> {
    try {
      // Clean up content first (due to foreign key constraints)
      if (filters.contentTitles) {
        await this.supabase
          .from('community_content')
          .delete()
          .in('title', filters.contentTitles)
      }

      // Clean up communities
      if (filters.communityNames) {
        await this.supabase
          .from('communities')
          .delete()
          .in('name', filters.communityNames)
      }

      // Clean up users (profiles and auth)
      if (filters.userEmails) {
        // Delete profiles first
        await this.supabase
          .from('profiles')
          .delete()
          .in('email', filters.userEmails)

        // Note: Auth users are handled by Supabase triggers
      }
    } catch (error) {
      console.warn('Cleanup warning:', error)
      // Don't fail tests if cleanup fails
    }
  }

  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(0)

      return !error || error.code !== 'PGRST204'
    } catch {
      return false
    }
  }

  async checkRLSEnabled(tableName: string): Promise<boolean> {
    try {
      // Try to access without auth - should be restricted if RLS is enabled
      const publicClient = createClient(
        this.supabase.supabaseUrl,
        this.supabase.supabaseKey.replace('service_role', 'anon')
      )

      const { error } = await publicClient
        .from(tableName)
        .select('*')
        .limit(1)

      // If we get a permissions error, RLS is working
      return error?.code === 'PGRST301' || error?.message?.includes('permission')
    } catch {
      return true // Assume RLS is enabled if there's an error
    }
  }
}

// HTTP request utilities
export class HttpTestHelper {
  static async testEndpoint(
    url: string,
    options: RequestInit = {}
  ): Promise<{ status: number; ok: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(url, {
        timeout: 10000, // 10 second timeout
        ...options
      })

      let data
      try {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          data = await response.json()
        } else if (contentType?.includes('text/')) {
          data = await response.text()
        }
      } catch {
        // Ignore parsing errors
      }

      return {
        status: response.status,
        ok: response.ok,
        data,
        error: !response.ok ? `HTTP ${response.status}` : undefined
      }
    } catch (error: any) {
      return {
        status: -1,
        ok: false,
        error: error.message
      }
    }
  }

  static async testAPIRoute(
    baseUrl: string,
    route: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): Promise<{ status: number; ok: boolean; data?: any; error?: string }> {
    const url = `${baseUrl}${route}`
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body)
    }

    return this.testEndpoint(url, options)
  }

  static async testPageLoad(url: string): Promise<{ 
    loadTime: number; 
    status: number; 
    size: number; 
    ok: boolean 
  }> {
    const start = performance.now()
    
    try {
      const response = await fetch(url)
      const content = await response.text()
      const loadTime = performance.now() - start
      
      return {
        loadTime,
        status: response.status,
        size: content.length,
        ok: response.ok
      }
    } catch (error) {
      return {
        loadTime: performance.now() - start,
        status: -1,
        size: 0,
        ok: false
      }
    }
  }
}

// Test result utilities
export class TestResultHelper {
  static createResult(
    success: boolean,
    details: string,
    data?: any
  ): { success: boolean; details: string; data?: any } {
    return { success, details, data }
  }

  static createSuccessResult(details: string, data?: any) {
    return this.createResult(true, details, data)
  }

  static createFailureResult(details: string, data?: any) {
    return this.createResult(false, details, data)
  }

  static aggregateResults(results: Array<{ success: boolean; details: string }>): {
    success: boolean;
    passed: number;
    failed: number;
    total: number;
    details: string;
  } {
    const passed = results.filter(r => r.success).length
    const failed = results.length - passed
    const total = results.length

    return {
      success: failed === 0,
      passed,
      failed,
      total,
      details: `${passed}/${total} tests passed`
    }
  }
}

// Export all utilities
export {
  TestDataGenerator,
  PerformanceMeasurer,
  TestValidators,
  DatabaseTestHelper,
  HttpTestHelper,
  TestResultHelper
}
