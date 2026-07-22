export class AtlasDirector {
  constructor(story) {
    this.story = story
    this.sceneIndex = 0
    this.lineIndex = 0
  }

  currentScene() {
    return this.story[this.sceneIndex]
  }

  currentLine() {
    const scene = this.currentScene()
    return scene?.narration[this.lineIndex] ?? null
  }

  nextLine() {
    const scene = this.currentScene()

    if (!scene) return null

    this.lineIndex++

    if (this.lineIndex >= scene.narration.length) {
      this.sceneIndex++
      this.lineIndex = 0
    }

    return this.currentLine()
  }

  reset() {
    this.sceneIndex = 0
    this.lineIndex = 0
  }

  finished() {
    return this.sceneIndex >= this.story.length
  }
}
