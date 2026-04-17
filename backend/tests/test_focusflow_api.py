"""
FocusFlow API Tests
Tests for: health check, session CRUD, stats calculation
"""
import pytest
import requests
import time


class TestHealth:
    """Health check endpoint"""

    def test_health_endpoint(self, api_client, base_url):
        """GET /api/health returns healthy status"""
        response = api_client.get(f"{base_url}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "time" in data
        print(f"✓ Health check passed: {data}")


class TestSessionCRUD:
    """Session creation, listing, and deletion"""

    def test_create_session_and_verify(self, api_client, base_url):
        """POST /api/sessions creates a session and GET verifies it"""
        # Create a test session
        payload = {
            "duration_seconds": 1500,
            "label": "TEST_Focus_Session",
            "mode": "focus",
            "user_id": "test_user"
        }
        create_response = api_client.post(f"{base_url}/api/sessions", json=payload)
        assert create_response.status_code == 200
        
        created = create_response.json()
        assert created["duration_seconds"] == 1500
        assert created["label"] == "TEST_Focus_Session"
        assert created["mode"] == "focus"
        assert created["user_id"] == "test_user"
        assert "id" in created
        assert "completed_at" in created
        assert "_id" not in created  # MongoDB _id should be excluded
        
        session_id = created["id"]
        print(f"✓ Session created: {session_id}")
        
        # Verify it appears in list
        list_response = api_client.get(f"{base_url}/api/sessions?user_id=test_user")
        assert list_response.status_code == 200
        sessions = list_response.json()
        assert isinstance(sessions, list)
        
        # Find our session
        found = next((s for s in sessions if s["id"] == session_id), None)
        assert found is not None
        assert found["duration_seconds"] == 1500
        assert found["label"] == "TEST_Focus_Session"
        print(f"✓ Session verified in list")
        
        # Cleanup
        delete_response = api_client.delete(f"{base_url}/api/sessions/{session_id}?user_id=test_user")
        assert delete_response.status_code == 200
        print(f"✓ Session deleted")

    def test_list_sessions_sorted_desc(self, api_client, base_url):
        """GET /api/sessions returns sessions sorted by completed_at descending"""
        # Create two sessions with slight delay
        session_ids = []
        
        for i in range(2):
            payload = {
                "duration_seconds": 300 + i,
                "label": f"TEST_Session_{i}",
                "mode": "focus",
                "user_id": "test_sort_user"
            }
            response = api_client.post(f"{base_url}/api/sessions", json=payload)
            assert response.status_code == 200
            session_ids.append(response.json()["id"])
            time.sleep(0.1)  # Small delay to ensure different timestamps
        
        # List sessions
        list_response = api_client.get(f"{base_url}/api/sessions?user_id=test_sort_user")
        assert list_response.status_code == 200
        sessions = list_response.json()
        
        # Verify sorted descending (newest first)
        test_sessions = [s for s in sessions if s["id"] in session_ids]
        assert len(test_sessions) >= 2
        
        # Most recent should be first
        assert test_sessions[0]["id"] == session_ids[-1]
        assert "_id" not in test_sessions[0]
        print(f"✓ Sessions sorted descending")
        
        # Cleanup
        for sid in session_ids:
            api_client.delete(f"{base_url}/api/sessions/{sid}?user_id=test_sort_user")

    def test_delete_session_not_found(self, api_client, base_url):
        """DELETE /api/sessions/{id} returns 404 for non-existent session"""
        response = api_client.delete(f"{base_url}/api/sessions/nonexistent-id?user_id=test_user")
        assert response.status_code == 404
        print(f"✓ Delete non-existent returns 404")


class TestStats:
    """Stats calculation endpoint"""

    def test_stats_structure(self, api_client, base_url):
        """GET /api/sessions/stats returns all required fields"""
        response = api_client.get(f"{base_url}/api/sessions/stats?user_id=test_stats_user")
        assert response.status_code == 200
        
        stats = response.json()
        assert "sessions_today" in stats
        assert "total_focus_seconds_today" in stats
        assert "total_focus_seconds_all_time" in stats
        assert "streak_days" in stats
        
        # All should be integers
        assert isinstance(stats["sessions_today"], int)
        assert isinstance(stats["total_focus_seconds_today"], int)
        assert isinstance(stats["total_focus_seconds_all_time"], int)
        assert isinstance(stats["streak_days"], int)
        
        print(f"✓ Stats structure valid: {stats}")

    def test_stats_calculation_with_sessions(self, api_client, base_url):
        """Stats correctly calculate after creating sessions"""
        user_id = "test_stats_calc_user"
        
        # Get initial stats
        initial_response = api_client.get(f"{base_url}/api/sessions/stats?user_id={user_id}")
        initial_stats = initial_response.json()
        initial_total = initial_stats["total_focus_seconds_all_time"]
        
        # Create a focus session
        payload = {
            "duration_seconds": 600,
            "label": "TEST_Stats_Session",
            "mode": "focus",
            "user_id": user_id
        }
        create_response = api_client.post(f"{base_url}/api/sessions", json=payload)
        assert create_response.status_code == 200
        session_id = create_response.json()["id"]
        
        # Get updated stats
        updated_response = api_client.get(f"{base_url}/api/sessions/stats?user_id={user_id}")
        updated_stats = updated_response.json()
        
        # Verify stats increased
        assert updated_stats["total_focus_seconds_all_time"] == initial_total + 600
        assert updated_stats["sessions_today"] >= 1
        assert updated_stats["total_focus_seconds_today"] >= 600
        
        print(f"✓ Stats calculation correct: {updated_stats}")
        
        # Cleanup
        api_client.delete(f"{base_url}/api/sessions/{session_id}?user_id={user_id}")

    def test_stats_excludes_break_sessions(self, api_client, base_url):
        """Stats only count focus sessions, not break sessions"""
        user_id = "test_break_user"
        
        # Get initial stats
        initial_response = api_client.get(f"{base_url}/api/sessions/stats?user_id={user_id}")
        initial_stats = initial_response.json()
        initial_total = initial_stats["total_focus_seconds_all_time"]
        
        # Create a break session
        break_payload = {
            "duration_seconds": 300,
            "label": "TEST_Break",
            "mode": "break",
            "user_id": user_id
        }
        break_response = api_client.post(f"{base_url}/api/sessions", json=break_payload)
        assert break_response.status_code == 200
        break_id = break_response.json()["id"]
        
        # Get stats after break
        after_break_response = api_client.get(f"{base_url}/api/sessions/stats?user_id={user_id}")
        after_break_stats = after_break_response.json()
        
        # Stats should NOT include break session
        assert after_break_stats["total_focus_seconds_all_time"] == initial_total
        
        print(f"✓ Break sessions excluded from stats")
        
        # Cleanup
        api_client.delete(f"{base_url}/api/sessions/{break_id}?user_id={user_id}")
