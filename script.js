const COLORS = {
    WHITE: 'white',
    RED: 'red',
    YELLOW: 'yellow',
    BLUE: 'blue',
    GREEN: 'green'
};

const ROW_CONFIG = {
    red: { color: 'red', range: [2, 18], direction: 'ltr' },
    yellow: { color: 'yellow', range: [2, 18], direction: 'ltr' },
    blue: { color: 'blue', range: [18, 2], direction: 'rtl' },
    green: { color: 'green', range: [18, 2], direction: 'rtl' }
};

class SloxxGame {
    constructor() {
        this.currentPlayer = 0;
        this.diceRolled = false;
        this.diceValues = [];
        this.diceColors = [];
        this.selectedDiceIndices = [];

        this.players = [
            { penalties: 0, rows: this.createPlayerRows(), score: 0 },
            { penalties: 0, rows: this.createPlayerRows(), score: 0 }
        ];

        this.lockedRows = 0;
        this.setupEventListeners();
        this.render();
    }

    createPlayerRows() {
        return {
            red: { numbers: this.getRange(2, 18), crossed: [] },
            yellow: { numbers: this.getRange(2, 18), crossed: [] },
            blue: { numbers: this.getRange(18, 2), crossed: [] },
            green: { numbers: this.getRange(18, 2), crossed: [] }
        };
    }

    getRange(start, end) {
        const arr = [];
        if (start <= end) {
            for (let i = start; i <= end; i++) arr.push(i);
        } else {
            for (let i = start; i >= end; i--) arr.push(i);
        }
        return arr;
    }

    setupEventListeners() {
        document.getElementById('rollBtn').addEventListener('click', () => this.rollDice());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('useSelectionBtn').addEventListener('click', () => this.processSelection());
        document.getElementById('clearSelectionBtn').addEventListener('click', () => this.clearSelection());
    }

    rollDice() {
        if (this.diceRolled && this.selectedDiceIndices.length === 0) return;

        this.diceValues = [];
        this.diceColors = [];

        // Roll 3 white dice
        for (let i = 0; i < 3; i++) {
            this.diceValues.push(Math.floor(Math.random() * 6) + 1);
            this.diceColors.push(COLORS.WHITE);
        }

        // Roll 4 color dice
        const colorDice = [COLORS.RED, COLORS.YELLOW, COLORS.BLUE, COLORS.GREEN];
        colorDice.forEach(color => {
            this.diceValues.push(Math.floor(Math.random() * 6) + 1);
            this.diceColors.push(color);
        });

        this.diceRolled = true;
        this.selectedDiceIndices = [];
        this.render();
    }

    selectDie(index) {
        if (!this.diceRolled) return;

        const isSelected = this.selectedDiceIndices.includes(index);
        if (isSelected) {
            this.selectedDiceIndices = this.selectedDiceIndices.filter(i => i !== index);
        } else {
            if (this.selectedDiceIndices.length < 3) {
                this.selectedDiceIndices.push(index);
            }
        }
        this.render();
    }

    clearSelection() {
        this.selectedDiceIndices = [];
        this.render();
    }

    isValidSelection() {
        if (this.selectedDiceIndices.length < 2 || this.selectedDiceIndices.length > 3) {
            return false;
        }

        const selectedColors = this.selectedDiceIndices.map(i => this.diceColors[i]);
        const whiteCount = selectedColors.filter(c => c === COLORS.WHITE).length;
        const colorCount = selectedColors.filter(c => c !== COLORS.WHITE).length;

        // All must be white, or white + one color
        if (colorCount > 1) return false;
        if (whiteCount === 0) return false;
        if (colorCount > 0 && whiteCount === 0) return false;

        return true;
    }

    getSelectionSum() {
        return this.selectedDiceIndices.reduce((sum, i) => sum + this.diceValues[i], 0);
    }

    getSelectionColor() {
        const colors = this.selectedDiceIndices.map(i => this.diceColors[i]);
        return colors.find(c => c !== COLORS.WHITE) || null;
    }

    processSelection() {
        if (!this.isValidSelection()) {
            alert('Invalid selection! Select 2-3 dice: white dice only, or white dice + one color die.');
            return;
        }

        const sum = this.getSelectionSum();
        const selectedColor = this.getSelectionColor();

        // Show available rows for marking
        const validRows = [];
        for (const [rowName, rowConfig] of Object.entries(ROW_CONFIG)) {
            const playerRow = this.players[this.currentPlayer].rows[rowName];
            if (playerRow && this.canMarkNumber(this.currentPlayer, rowName, sum)) {
                validRows.push(rowName);
            }
        }

        // If only color is selected, can only use that color's row for active player
        if (selectedColor && selectedColor !== COLORS.WHITE) {
            const colorRowMap = {
                [COLORS.RED]: 'red',
                [COLORS.YELLOW]: 'yellow',
                [COLORS.BLUE]: 'blue',
                [COLORS.GREEN]: 'green'
            };
            const targetRow = colorRowMap[selectedColor];
            if (validRows.includes(targetRow)) {
                this.markNumber(this.currentPlayer, targetRow, sum);
            } else {
                alert(`Cannot mark ${sum} in ${selectedColor} row!`);
            }
        } else {
            // All white - any player can mark, active player chooses
            if (validRows.length === 0) {
                this.applyPenalty();
            } else if (validRows.length === 1) {
                this.markNumber(this.currentPlayer, validRows[0], sum);
            } else {
                // Multiple options - show selection dialog
                const rowChoice = this.showRowSelection(validRows, sum);
                if (rowChoice) {
                    this.markNumber(this.currentPlayer, rowChoice, sum);
                } else {
                    this.applyPenalty();
                }
            }
        }
    }

    showRowSelection(validRows, sum) {
        const rowNames = {
            red: 'Red',
            yellow: 'Yellow',
            blue: 'Blue',
            green: 'Green'
        };

        let message = `Mark ${sum} in which row?\n\n`;
        validRows.forEach((row, i) => {
            message += `${i + 1}. ${rowNames[row]}\n`;
        });
        message += `${validRows.length + 1}. Skip (take penalty)`;

        const choice = prompt(message, '1');
        if (!choice) return null;

        const choiceNum = parseInt(choice) - 1;
        if (choiceNum < 0 || choiceNum >= validRows.length) {
            return null;
        }

        return validRows[choiceNum];
    }

    canMarkNumber(playerIdx, rowName, number) {
        const row = this.players[playerIdx].rows[rowName];
        const numbers = row.numbers;
        const crossed = row.crossed;

        // Check if number exists in this row
        if (!numbers.includes(number)) return false;

        // Check if already crossed
        const numberIdx = numbers.indexOf(number);
        if (crossed.includes(numberIdx)) return false;

        // Must be the next unmarked number in sequence
        for (let i = 0; i < numberIdx; i++) {
            if (!crossed.includes(i)) return false;
        }

        return true;
    }

    markNumber(playerIdx, rowName, number) {
        const row = this.players[playerIdx].rows[rowName];
        const numberIdx = row.numbers.indexOf(number);
        row.crossed.push(numberIdx);

        // Check if row should be locked
        if (row.crossed.length >= 7 && row.crossed.includes(row.numbers.length - 1)) {
            this.lockedRows++;
            row.locked = true;
        }

        this.selectedDiceIndices = [];
        this.diceRolled = false;

        if (this.isGameOver()) {
            this.endGame();
        } else {
            this.nextTurn();
        }

        this.render();
    }

    applyPenalty() {
        this.players[this.currentPlayer].penalties++;
        this.selectedDiceIndices = [];
        this.diceRolled = false;

        if (this.players[this.currentPlayer].penalties >= 4 || this.lockedRows >= 2) {
            this.endGame();
        } else {
            this.nextTurn();
        }

        this.render();
    }

    nextTurn() {
        this.currentPlayer = 1 - this.currentPlayer;
    }

    isGameOver() {
        return this.lockedRows >= 2 || this.players.some(p => p.penalties >= 4);
    }

    endGame() {
        this.calculateScores();
        const p1Score = this.players[0].score;
        const p2Score = this.players[1].score;

        let message = 'GAME OVER!\n\n';
        message += `Player 1: ${p1Score} points\n`;
        message += `Player 2: ${p2Score} points\n\n`;

        if (p1Score > p2Score) {
            message += 'Player 1 Wins!';
        } else if (p2Score > p1Score) {
            message += 'Player 2 Wins!';
        } else {
            message += 'It\'s a Tie!';
        }

        alert(message);
    }

    calculateScores() {
        this.players.forEach(player => {
            let score = 0;
            Object.values(player.rows).forEach(row => {
                // Bonus points for crossing numbers
                const points = [0, 0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 120, 136];
                if (row.crossed.length > 0) {
                    score += points[row.crossed.length] || 0;
                }
            });
            score -= player.penalties * 5;
            player.score = Math.max(0, score);
        });
    }

    resetGame() {
        this.currentPlayer = 0;
        this.diceRolled = false;
        this.diceValues = [];
        this.diceColors = [];
        this.selectedDiceIndices = [];
        this.players = [
            { penalties: 0, rows: this.createPlayerRows(), score: 0 },
            { penalties: 0, rows: this.createPlayerRows(), score: 0 }
        ];
        this.lockedRows = 0;
        this.render();
    }

    render() {
        this.renderDice();
        this.renderDiceSelection();
        this.renderScores();
        this.updateGameStatus();
    }

    renderDice() {
        const whiteDiceContainer = document.getElementById('whiteDiceContainer');
        const colorDiceContainer = document.getElementById('colorDiceContainer');

        whiteDiceContainer.innerHTML = '';
        colorDiceContainer.innerHTML = '';

        this.diceValues.forEach((value, index) => {
            const die = document.createElement('div');
            die.className = `die ${this.diceColors[index]}`;
            die.textContent = value;

            if (this.selectedDiceIndices.includes(index)) {
                die.classList.add('selected');
            }

            die.addEventListener('click', () => this.selectDie(index));

            if (this.diceColors[index] === COLORS.WHITE) {
                whiteDiceContainer.appendChild(die);
            } else {
                colorDiceContainer.appendChild(die);
            }
        });
    }

    renderDiceSelection() {
        const selectionGrid = document.getElementById('diceSelection');
        const useBtn = document.getElementById('useSelectionBtn');

        selectionGrid.innerHTML = '';

        const selectedDice = this.selectedDiceIndices.map(i => ({
            value: this.diceValues[i],
            color: this.diceColors[i],
            index: i
        }));

        selectedDice.forEach(dice => {
            const die = document.createElement('div');
            die.className = `die ${dice.color}`;
            die.textContent = dice.value;
            die.style.opacity = '0.8';
            selectionGrid.appendChild(die);
        });

        const sum = this.getSelectionSum();
        const sumDisplay = document.createElement('div');
        sumDisplay.style.gridColumn = 'span 2';
        sumDisplay.style.fontSize = '1.1rem';
        sumDisplay.style.fontWeight = 'bold';
        sumDisplay.style.color = '#667eea';
        if (this.selectedDiceIndices.length > 0) {
            sumDisplay.textContent = `Sum: ${sum}`;
            selectionGrid.appendChild(sumDisplay);
        }

        useBtn.disabled = !this.isValidSelection();
    }

    renderScores() {
        this.players.forEach((player, playerIdx) => {
            const penalties = document.getElementById(`penalties${playerIdx + 1}`);
            const rowsContainer = document.getElementById(`rows${playerIdx + 1}`);
            const scoreEl = document.getElementById(`score${playerIdx + 1}`);

            // Penalties
            penalties.innerHTML = '';
            for (let i = 0; i < 4; i++) {
                const marker = document.createElement('div');
                marker.className = 'penalty-marker';
                if (i < player.penalties) {
                    marker.textContent = '✕';
                    marker.style.opacity = '1';
                } else {
                    marker.style.opacity = '0.3';
                }
                penalties.appendChild(marker);
            }

            // Rows
            rowsContainer.innerHTML = '';
            Object.entries(player.rows).forEach(([rowName, row]) => {
                const rowEl = document.createElement('div');
                rowEl.className = `row ${rowName}`;
                if (row.locked) rowEl.classList.add('locked');

                const label = document.createElement('div');
                label.className = 'row-label';
                label.textContent = rowName.charAt(0).toUpperCase() + rowName.slice(1);
                rowEl.appendChild(label);

                const numbersDiv = document.createElement('div');
                numbersDiv.className = 'row-numbers';

                row.numbers.forEach((number, idx) => {
                    const numBox = document.createElement('div');
                    numBox.className = 'number-box';
                    numBox.textContent = number;

                    if (row.crossed.includes(idx)) {
                        numBox.classList.add('checked');
                    } else if (row.crossed.length > 0 && idx < Math.max(...row.crossed)) {
                        numBox.classList.add('missed');
                    }

                    numbersDiv.appendChild(numBox);
                });

                rowEl.appendChild(numbersDiv);
                rowsContainer.appendChild(rowEl);
            });

            // Score
            this.calculateScores();
            scoreEl.textContent = `Score: ${player.score}`;
        });
    }

    updateGameStatus() {
        const status = document.getElementById('gameStatus');
        const rollBtn = document.getElementById('rollBtn');

        if (this.isGameOver()) {
            status.textContent = '🏁 Game Over!';
            rollBtn.disabled = true;
        } else {
            status.textContent = `Player ${this.currentPlayer + 1}'s Turn${this.diceRolled ? ' - Select Dice' : ''}`;
            rollBtn.disabled = false;
        }
    }
}

// Initialize game
const game = new SloxxGame();
