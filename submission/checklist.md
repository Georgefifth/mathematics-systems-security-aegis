# Devpost Submission Checklist — AegisAgent

> **Notice for Human Submitter**:
> According to AGENTS.md rules, only you (the human) can log in to Devpost, upload the video, fill in the form fields, and click Submit.
> Follow this quick 5-minute step-by-step checklist to submit AegisAgent to the hackathon.

---

## 1. 提交前准备 (Pre-Flight)

- [ ] **Devpost Hackathon Page**: Open [https://mathematics-systems-security.devpost.com/](https://mathematics-systems-security.devpost.com/) and ensure you are logged in.
- [ ] **Track Selection**:
  - The project qualifies for both tracks, and explicitly targets **Best Overall Project (Grand Prize)** which requires demonstrating criteria across both tracks.
  - When prompted to choose a track, select either **Cryptographer track** or **AI pipeline secret sharing track** based on your personal eligibility/preference (the project submission description covers both tracks comprehensively).

---

## 2. 视频上传 (Video Upload)

- [ ] Open YouTube (or Vimeo).
- [ ] Upload the rendered 1080p demo video located at:
  ```
  submission/assets/demo.mp4
  ```
- [ ] Set video visibility to **Public** or **Unlisted**.
- [ ] Copy the video link (e.g. `https://youtu.be/...`) and paste it into the **Video Demo** field on Devpost.

---

## 3. Devpost 表单字段复制 (Copy-Paste Form Fields)

Open `submission/fields.md` and copy the exact text into each corresponding Devpost form field:

- [ ] **Project Name**:
  ```text
  AegisAgent
  ```
- [ ] **Elevator Pitch**:
  ```text
  Side-channel resistant zero-knowledge secret-shared enclave & privacy gateway for autonomous AI agents, eliminating master key leaks and cache-timing attacks.
  ```
- [ ] **Thumbnail Image**:
  - Upload: `submission/assets/thumbnail.png` (Verified 1200×800 px, 3:2 ratio).
- [ ] **About the Project**:
  - Copy the full Markdown text from the `### About the Project` block in `submission/fields.md`.
  - Check preview in Devpost: ensure headers (`##`), bullet points, and code blocks render cleanly.
- [ ] **Built With**:
  ```text
  rust, axum, tokio, cryptography, secret-sharing, mersenne-prime, cauchy-matrix, constant-time, side-channel-defense, dudect, react, tailwindcss, vite, playwright, python, rich-tui, vercel
  ```
- [ ] **Try It Out Links**:
  - Web Application URL: `https://web-eta-bice-53.vercel.app`
  - GitHub Repository URL: `https://github.com/Georgefifth/mathematics-systems-security-aegis`
- [ ] **Image Gallery**:
  Upload all 6 images from `submission/assets/` and copy their matching captions from `submission/fields.md`:
  1. `submission/assets/gallery-01-enclave-vault.png`
  2. `submission/assets/gallery-02-sidechannel-dudect.png`
  3. `submission/assets/gallery-03-agent-gateway.png`
  4. `submission/assets/gallery-04-prompt-injection-defense.png`
  5. `submission/assets/gallery-05-latex-specifications.png`
  6. `submission/assets/gallery-06-architecture-topology.png`

---

## 4. 最终检查与点击提交 (Review & Submit)

- [ ] Verify that `https://web-eta-bice-53.vercel.app` loads and functions when clicked from Devpost.
- [ ] Verify that `https://github.com/Georgefifth/mathematics-systems-security-aegis` is accessible publicly.
- [ ] Verify that YouTube video plays with clear voiceover, captions, and audio.
- [ ] Click **Save and Continue** / **Submit Project**.
- [ ] Confirm submission success on Devpost.
