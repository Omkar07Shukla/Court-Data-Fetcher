const TWO_CAPTCHA_KEY = process.env.TWOCAPTCHA_API_KEY
const ANTI_CAPTCHA_KEY = process.env.ANTICAPTCHA_API_KEY

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Attempts to solve an image CAPTCHA via 2Captcha or AntiCaptcha if configured.
 * Returns the solved text or undefined if no keys are present.
 * If neither key is present, returns undefined (caller should handle fallback).
 */
export async function solveCaptchaIfNeeded(captchaImageUrl: string): Promise<string | undefined> {
  // Fetch image as base64
  const imgRes = await fetch(captchaImageUrl)
  if (!imgRes.ok) {
    throw new Error("Failed to fetch CAPTCHA image")
  }
  const arrayBuf = await imgRes.arrayBuffer()
  const base64 = Buffer.from(arrayBuf).toString("base64")

  if (TWO_CAPTCHA_KEY) {
    // 2Captcha flow
    // 1) Upload
    const formData = new URLSearchParams()
    formData.set("key", TWO_CAPTCHA_KEY)
    formData.set("method", "base64")
    formData.set("body", base64)
    formData.set("json", "1")

    const up = await fetch("https://2captcha.com/in.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    })
    const upJson = (await up.json()) as any
    if (upJson.status !== 1) {
      throw new Error("2Captcha upload failed")
    }
    const captchaId = upJson.request

    // 2) Poll result
    for (let i = 0; i < 30; i++) {
      await sleep(5000)
      const res = await fetch(
        `https://2captcha.com/res.php?key=${encodeURIComponent(
          TWO_CAPTCHA_KEY,
        )}&action=get&id=${encodeURIComponent(captchaId)}&json=1`,
      )
      const js = (await res.json()) as any
      if (js.status === 1) {
        return js.request as string
      }
      if (js.request !== "CAPCHA_NOT_READY") {
        throw new Error(`2Captcha error: ${js.request}`)
      }
    }
    throw new Error("2Captcha timeout")
  }

  if (ANTI_CAPTCHA_KEY) {
    // AntiCaptcha image-to-text
    // 1) createTask
    const createTask = await fetch("https://api.anti-captcha.com/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientKey: ANTI_CAPTCHA_KEY,
        task: {
          type: "ImageToTextTask",
          body: base64,
        },
      }),
    })
    const createJson = (await createTask.json()) as any
    if (createJson.errorId !== 0) {
      throw new Error(`AntiCaptcha createTask error: ${createJson.errorDescription}`)
    }
    const taskId = createJson.taskId

    // 2) getTaskResult
    for (let i = 0; i < 30; i++) {
      await sleep(5000)
      const res = await fetch("https://api.anti-captcha.com/getTaskResult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey: ANTI_CAPTCHA_KEY, taskId }),
      })
      const js = (await res.json()) as any
      if (js.status === "ready") {
        return js.solution?.text as string
      }
      if (js.errorId && js.errorId !== 0) {
        throw new Error(`AntiCaptcha error: ${js.errorDescription}`)
      }
    }
    throw new Error("AntiCaptcha timeout")
  }

  // No solver configured
  return undefined
}
