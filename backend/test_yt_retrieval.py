from youtube_transcript_api import YouTubeTranscriptApi
import sys

video_id = "qcALGDn0zpk"
try:
    print(f"Attempting to fetch transcript for {video_id}...")
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    print("Success! First 100 chars:", str(transcript)[:100])
except Exception as e:
    print(f"Failed: {e}")
    try:
        print("Attempting with proxy/language fallbacks...")
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        # Try to find any english transcript (manually created or auto-generated)
        transcript = transcript_list.find_transcript(['en'])
        print("Success with fallback! First 100 chars:", str(transcript.fetch())[:100])
    except Exception as e2:
        print(f"Still failed: {e2}")
