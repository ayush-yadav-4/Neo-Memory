/**
 * Retry function with exponential backoff for API calls
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: any

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Don't retry on permanent errors
      const permanentErrors = ["Invalid model", "authentication", "invalid api key", "unauthorized"]

      const isPermanentError = permanentErrors.some((errMsg) =>
        error.message?.toLowerCase().includes(errMsg.toLowerCase()),
      )

      if (isPermanentError) {
        throw error
      }

      // Retry with exponential backoff
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        console.log(`⚠️ Retry ${i + 1}/${maxRetries} after ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

