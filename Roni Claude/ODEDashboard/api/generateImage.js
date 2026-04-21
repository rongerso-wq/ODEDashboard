/**
 * Serverless function for generating images using Replicate API.
 *
 * Uses Flux image model for high-quality results.
 * Receives: { prompt }
 * Returns: { imageUrl }
 *
 * Security note: API token is stored in environment variables, never exposed to client.
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check API token exists
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    console.error('REPLICATE_API_TOKEN not set in environment variables')
    return res.status(500).json({ error: 'Image API not configured' })
  }

  try {
    const { prompt } = req.body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // Call Replicate API using Flux model
    const replicateRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'authorization': `Token ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        version: 'fed869f0fd4a2b5f33a6a74bdc0cd67c8ce37b30c2e5d8e0faf72f3c00b1e0e7', // Flux model
        input: {
          prompt: prompt,
          guidance: 3.5,
          num_inference_steps: 20,
        },
      }),
    })

    if (!replicateRes.ok) {
      const errData = await replicateRes.json()
      console.error('Replicate API error:', errData)
      return res.status(500).json({
        error: `Image generation failed: ${errData.detail || 'Unknown error'}`,
      })
    }

    const prediction = await replicateRes.json()

    // Replicate returns immediately with a prediction ID
    // We need to poll for the result
    let finalPrediction = prediction
    let attempts = 0
    const maxAttempts = 60 // 2 minutes max (60 * 2 second checks)

    while (finalPrediction.status === 'processing' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds

      const statusRes = await fetch(
        `https://api.replicate.com/v1/predictions/${finalPrediction.id}`,
        {
          headers: { 'authorization': `Token ${token}` },
        }
      )

      if (!statusRes.ok) {
        throw new Error('Failed to check image generation status')
      }

      finalPrediction = await statusRes.json()
      attempts++
    }

    // Check if generation succeeded
    if (finalPrediction.status !== 'succeeded') {
      console.error('Image generation failed:', finalPrediction)
      return res.status(500).json({
        error: `Image generation ${finalPrediction.status}. Try again.`,
      })
    }

    // Extract image URL from output
    const imageUrl = finalPrediction.output?.[0]
    if (!imageUrl) {
      console.error('No image in Replicate response:', finalPrediction)
      return res.status(500).json({ error: 'No image generated' })
    }

    res.status(200).json({ imageUrl })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
