"""
Tests for the answer selection system.
Run with: pytest test_answer_selection.py -v
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from main import GameRoom, handle_player_message, handle_host_message


@pytest.fixture
def room():
    """Create a fresh game room for each test."""
    room = GameRoom("test-room", "Test Host")
    room.host_ws = AsyncMock()
    return room


@pytest.fixture
def room_with_players(room):
    """Create a room with 3 connected players."""
    room.players = {
        "player1": {"name": "Alice", "score": 0, "ws": AsyncMock(), "connected": True},
        "player2": {"name": "Bob", "score": 0, "ws": AsyncMock(), "connected": True},
        "player3": {"name": "Charlie", "score": 0, "ws": AsyncMock(), "connected": True},
    }
    return room


@pytest.fixture
def question():
    """Sample question with 4 options."""
    return {
        "id": "test1",
        "question": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correct_answer": "4",  # This is option B
        "points": 100
    }


class TestAnswerSubmission:
    """Test submitting answers."""

    @pytest.mark.asyncio
    async def test_submit_answer_records_position(self, room_with_players):
        """First player to answer gets position 1."""
        room = room_with_players
        room.question_active = True
        room.current_question = {"points": 100}

        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "A"})

        assert "player1" in room.answer_submissions
        assert room.answer_submissions["player1"]["answer"] == "A"
        assert room.answer_submissions["player1"]["position"] == 1
        assert room.submission_order == ["player1"]

    @pytest.mark.asyncio
    async def test_submit_answer_order_matters(self, room_with_players):
        """Players get positions based on submission order."""
        room = room_with_players
        room.question_active = True
        room.current_question = {"points": 100}

        await handle_player_message(room, "player2", {"type": "submit_answer", "answer": "B"})
        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "A"})
        await handle_player_message(room, "player3", {"type": "submit_answer", "answer": "C"})

        assert room.answer_submissions["player2"]["position"] == 1
        assert room.answer_submissions["player1"]["position"] == 2
        assert room.answer_submissions["player3"]["position"] == 3
        assert room.submission_order == ["player2", "player1", "player3"]

    @pytest.mark.asyncio
    async def test_cannot_submit_twice(self, room_with_players):
        """Player cannot change their answer once submitted."""
        room = room_with_players
        room.question_active = True
        room.current_question = {"points": 100}

        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "A"})
        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "B"})

        # Should still be A, not B
        assert room.answer_submissions["player1"]["answer"] == "A"
        assert len(room.submission_order) == 1

    @pytest.mark.asyncio
    async def test_cannot_submit_when_question_inactive(self, room_with_players):
        """Cannot submit answer when no question is active."""
        room = room_with_players
        room.question_active = False

        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "A"})

        assert "player1" not in room.answer_submissions

    @pytest.mark.asyncio
    async def test_answer_confirmed_sent_to_player(self, room_with_players):
        """Player receives confirmation with their position."""
        room = room_with_players
        room.question_active = True
        room.current_question = {"points": 100}

        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "B"})

        # Check that answer_confirmed was sent
        room.players["player1"]["ws"].send_json.assert_called()
        call_args = room.players["player1"]["ws"].send_json.call_args[0][0]
        assert call_args["type"] == "answer_confirmed"
        assert call_args["position"] == 1
        assert call_args["answer"] == "B"

    @pytest.mark.asyncio
    async def test_answer_count_sent_to_host(self, room_with_players):
        """Host receives answer count update."""
        room = room_with_players
        room.question_active = True
        room.current_question = {"points": 100}

        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "A"})

        # Check that answer_count_update was sent to host
        room.host_ws.send_json.assert_called()
        call_args = room.host_ws.send_json.call_args[0][0]
        assert call_args["type"] == "answer_count_update"
        assert call_args["count"] == 1
        assert call_args["total_players"] == 3


class TestAutoScoring:
    """Test automatic scoring when answer is revealed."""

    @pytest.mark.asyncio
    async def test_correct_answer_first_place(self, room_with_players, question):
        """First place correct answer gets 100% of points."""
        room = room_with_players
        room.current_question = question
        room.question_active = True

        # Player 1 answers correctly with B (which is "4")
        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "B"})

        # Reveal answer
        await handle_host_message(room, {"type": "reveal_answer"})

        # Player 1 should get 100 points (100% of 100)
        assert room.players["player1"]["score"] == 100

    @pytest.mark.asyncio
    async def test_correct_answer_position_multipliers(self, room_with_players, question):
        """Position multipliers: 1st=100%, 2nd=75%, 3rd=50%, 4th+=25%."""
        room = room_with_players
        room.players["player4"] = {"name": "David", "score": 0, "ws": AsyncMock(), "connected": True}
        room.current_question = question
        room.question_active = True

        # All players answer correctly in order
        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "B"})
        await handle_player_message(room, "player2", {"type": "submit_answer", "answer": "B"})
        await handle_player_message(room, "player3", {"type": "submit_answer", "answer": "B"})
        await handle_player_message(room, "player4", {"type": "submit_answer", "answer": "B"})

        await handle_host_message(room, {"type": "reveal_answer"})

        assert room.players["player1"]["score"] == 100  # 100%
        assert room.players["player2"]["score"] == 75   # 75%
        assert room.players["player3"]["score"] == 50   # 50%
        assert room.players["player4"]["score"] == 25   # 25%

    @pytest.mark.asyncio
    async def test_wrong_answer_penalty(self, room_with_players, question):
        """Wrong answer gets negative points (half of what correct would get)."""
        room = room_with_players
        room.current_question = question
        room.question_active = True

        # Player answers wrong with A instead of B
        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "A"})

        await handle_host_message(room, {"type": "reveal_answer"})

        # First place wrong: -(100/2) * 1.0 = -50
        assert room.players["player1"]["score"] == -50

    @pytest.mark.asyncio
    async def test_wrong_answer_position_multipliers(self, room_with_players, question):
        """Wrong answer penalties also use position multipliers."""
        room = room_with_players
        room.current_question = question
        room.question_active = True

        # All players answer wrong
        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "A"})
        await handle_player_message(room, "player2", {"type": "submit_answer", "answer": "C"})
        await handle_player_message(room, "player3", {"type": "submit_answer", "answer": "D"})

        await handle_host_message(room, {"type": "reveal_answer"})

        # 1st wrong: -(100/2) * 1.0 = -50
        # 2nd wrong: -(100/2) * 0.75 = -37
        # 3rd wrong: -(100/2) * 0.5 = -25
        assert room.players["player1"]["score"] == -50
        assert room.players["player2"]["score"] == -37
        assert room.players["player3"]["score"] == -25

    @pytest.mark.asyncio
    async def test_no_answer_penalty(self, room_with_players, question):
        """Players who don't answer get -25 penalty."""
        room = room_with_players
        room.current_question = question
        room.question_active = True

        # Only player1 answers
        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "B"})

        await handle_host_message(room, {"type": "reveal_answer"})

        # player2 and player3 didn't answer, get -25
        assert room.players["player2"]["score"] == -25
        assert room.players["player3"]["score"] == -25

    @pytest.mark.asyncio
    async def test_mixed_results(self, room_with_players, question):
        """Test mix of correct, wrong, and no answer."""
        room = room_with_players
        room.current_question = question
        room.question_active = True

        # player1 correct (1st), player2 wrong (2nd), player3 no answer
        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "B"})
        await handle_player_message(room, "player2", {"type": "submit_answer", "answer": "A"})

        await handle_host_message(room, {"type": "reveal_answer"})

        assert room.players["player1"]["score"] == 100   # 1st correct
        assert room.players["player2"]["score"] == -37   # 2nd wrong: -(50 * 0.75)
        assert room.players["player3"]["score"] == -25   # no answer

    @pytest.mark.asyncio
    async def test_scoring_results_in_response(self, room_with_players, question):
        """Reveal answer broadcasts scoring results to all."""
        room = room_with_players
        room.current_question = question
        room.question_active = True

        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "B"})
        await handle_player_message(room, "player2", {"type": "submit_answer", "answer": "A"})

        await handle_host_message(room, {"type": "reveal_answer"})

        # Check the broadcast message
        # The last call should be the answer_revealed broadcast
        calls = room.host_ws.send_json.call_args_list
        reveal_call = None
        for call in calls:
            if call[0][0].get("type") == "answer_revealed":
                reveal_call = call[0][0]
                break

        assert reveal_call is not None
        assert reveal_call["correct_answer"] == "4"
        assert reveal_call["correct_letter"] == "B"
        assert "scoring_results" in reveal_call
        assert len(reveal_call["scoring_results"]) == 3  # All 3 players

        # Check scoring result structure
        results_by_id = {r["player_id"]: r for r in reveal_call["scoring_results"]}
        assert results_by_id["player1"]["is_correct"] == True
        assert results_by_id["player1"]["points"] == 100
        assert results_by_id["player2"]["is_correct"] == False
        assert results_by_id["player2"]["points"] == -37
        assert results_by_id["player3"]["answer"] == None
        assert results_by_id["player3"]["points"] == -25


class TestQuestionLifecycle:
    """Test the full question lifecycle."""

    @pytest.mark.asyncio
    async def test_start_question_clears_state(self, room_with_players, question):
        """Starting a new question clears previous answers."""
        room = room_with_players
        room.answer_submissions = {"old": {"answer": "A"}}
        room.submission_order = ["old"]
        room.mini_game_active = False

        await handle_host_message(room, {"type": "start_question", "question": question})

        assert room.answer_submissions == {}
        assert room.submission_order == []
        assert room.question_active == True
        assert room.current_question == question

    @pytest.mark.asyncio
    async def test_next_question_clears_state(self, room_with_players, question):
        """Moving to next question clears answer state."""
        room = room_with_players
        room.current_question = question
        room.answer_submissions = {"player1": {"answer": "A"}}
        room.submission_order = ["player1"]

        await handle_host_message(room, {"type": "next_question"})

        assert room.answer_submissions == {}
        assert room.submission_order == []
        assert room.current_question == None
        assert room.question_active == False

    @pytest.mark.asyncio
    async def test_reveal_deactivates_question(self, room_with_players, question):
        """Revealing answer deactivates the question."""
        room = room_with_players
        room.current_question = question
        room.question_active = True

        await handle_host_message(room, {"type": "reveal_answer"})

        assert room.question_active == False


class TestEdgeCases:
    """Test edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_reveal_with_no_submissions(self, room_with_players, question):
        """Revealing when no one answered - all get -25."""
        room = room_with_players
        room.current_question = question
        room.question_active = True

        await handle_host_message(room, {"type": "reveal_answer"})

        assert room.players["player1"]["score"] == -25
        assert room.players["player2"]["score"] == -25
        assert room.players["player3"]["score"] == -25

    @pytest.mark.asyncio
    async def test_disconnected_player_not_penalized(self, room_with_players, question):
        """Disconnected players don't get no-answer penalty."""
        room = room_with_players
        room.players["player3"]["connected"] = False
        room.current_question = question
        room.question_active = True

        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "B"})

        await handle_host_message(room, {"type": "reveal_answer"})

        # player1 correct, player2 no answer, player3 disconnected (no penalty)
        assert room.players["player1"]["score"] == 100
        assert room.players["player2"]["score"] == -25
        assert room.players["player3"]["score"] == 0  # Not penalized

    @pytest.mark.asyncio
    async def test_custom_point_values(self, room_with_players):
        """Questions can have custom point values."""
        question = {
            "id": "test",
            "question": "Hard question",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A",
            "points": 200  # Double points!
        }
        room = room_with_players
        room.current_question = question
        room.question_active = True

        await handle_player_message(room, "player1", {"type": "submit_answer", "answer": "A"})

        await handle_host_message(room, {"type": "reveal_answer"})

        assert room.players["player1"]["score"] == 200

    @pytest.mark.asyncio
    async def test_fifth_place_still_gets_25_percent(self, room_with_players, question):
        """5th place and beyond all get 25% multiplier."""
        room = room_with_players
        room.players["player4"] = {"name": "D", "score": 0, "ws": AsyncMock(), "connected": True}
        room.players["player5"] = {"name": "E", "score": 0, "ws": AsyncMock(), "connected": True}
        room.current_question = question
        room.question_active = True

        for i in range(1, 6):
            await handle_player_message(room, f"player{i}", {"type": "submit_answer", "answer": "B"})

        await handle_host_message(room, {"type": "reveal_answer"})

        assert room.players["player4"]["score"] == 25  # 4th = 25%
        assert room.players["player5"]["score"] == 25  # 5th = 25%


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
