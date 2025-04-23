import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { Grid, Box, Typography, Paper, List, ListItem, ListItemText } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const GRID_SIZE = 12;
const WORDS = ['REACT', 'JAVASCRIPT', 'MATERIAL', 'PUZZLE', 'DEVELOPER', 'CODING'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    maxWidth: 800,
    margin: '0 auto',
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  },
  gridCell: {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #ccc',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    userSelect: 'none',
    [theme.breakpoints.down('sm')]: {
      width: 30,
      height: 30,
      fontSize: 12,
    },
  },
  selected: {
    backgroundColor: '#e3f2fd',
    transform: 'scale(1.1)',
  },
  found: {
    backgroundColor: '#c8e6c9',
    animation: '$pulse 0.5s ease',
  },
  '@keyframes pulse': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.15)' },
    '100%': { transform: 'scale(1)' },
  },
  foundWords: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
  },
}));

interface Cell {
  letter: string;
  isSelected: boolean;
  isFound: boolean;
  wordId?: number;
}

interface State {
  grid: Cell[][];
  selectedCells: [number, number][];
  foundWords: string[];
}

type Action =
  | { type: 'SELECT_CELL'; payload: [number, number] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'MARK_FOUND'; payload: { word: string; cells: [number, number][] } };

const initialState: State = {
  grid: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null).map(() => ({
    letter: '',
    isSelected: false,
    isFound: false,
  }))),
  selectedCells: [],
  foundWords: [],
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SELECT_CELL':
      return {
        ...state,
        selectedCells: [...state.selectedCells, action.payload],
        grid: state.grid.map((row, i) =>
          row.map((cell, j) => ({
            ...cell,
            isSelected: state.selectedCells.some(([x, y]) => x === i && y === j) ||
              (i === action.payload[0] && j === action.payload[1]),
          }))
        ),
      };
    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedCells: [],
        grid: state.grid.map(row => row.map(cell => ({ ...cell, isSelected: false }))),
      };
    case 'MARK_FOUND':
      return {
        ...state,
        foundWords: [...state.foundWords, action.payload.word],
        grid: state.grid.map((row, i) =>
          row.map((cell, j) => ({
            ...cell,
            isFound: action.payload.cells.some(([x, y]) => x === i && y === j) || cell.isFound,
            isSelected: false,
          }))
        ),
        selectedCells: [],
      };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const classes = useStyles();
  const [state, dispatch] = useReducer(reducer, initialState);

  const generateGrid = useCallback(() => {
    const grid: Cell[][] = Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill(null).map(() => ({
        letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
        isSelected: false,
        isFound: false,
      }))
    );

    const directions = [
      [0, 1], [1, 0], [1, 1], [-1, 1],
      [0, -1], [-1, 0], [-1, -1], [1, -1]
    ];

    WORDS.forEach((word, wordId) => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const startRow = Math.floor(Math.random() * GRID_SIZE);
        const startCol = Math.floor(Math.random() * GRID_SIZE);
        const endRow = startRow + (word.length - 1) * dir[0];
        const endCol = startCol + (word.length - 1) * dir[1];

        if (
          endRow >= 0 && endRow < GRID_SIZE &&
          endCol >= 0 && endCol < GRID_SIZE
        ) {
          const path: [number, number][] = [];
          let canPlace = true;

          for (let i = 0; i < word.length; i++) {
            const row = startRow + i * dir[0];
            const col = startCol + i * dir[1];
            if (grid[row][col].wordId !== undefined && grid[row][col].wordId !== wordId) {
              canPlace = false;
              break;
            }
            path.push([row, col]);
          }

          if (canPlace) {
            word.split('').forEach((letter, i) => {
              const [row, col] = path[i];
              grid[row][col] = { ...grid[row][col], letter, wordId };
            });
            placed = true;
          }
        }
        attempts++;
      }
    });

    dispatch({ type: 'CLEAR_SELECTION' });
    return grid;
  }, []);

  useEffect(() => {
    const newGrid = generateGrid();
    dispatch({ type: 'MARK_FOUND', payload: { word: '', cells: [] } });
    // Update grid in state
    newGrid.forEach((row, i) => {
      row.forEach((cell, j) => {
        state.grid[i][j] = cell;
      });
    });
  }, [generateGrid]);

  const handleCellClick = (row: number, col: number) => {
    dispatch({ type: 'SELECT_CELL', payload: [row, col] });

    const selected = [...state.selectedCells, [row, col]];
    if (selected.length >= 2) {
      const word = getWordFromSelection(selected);
      if (WORDS.includes(word)) {
        dispatch({ type: 'MARK_FOUND', payload: { word, cells: selected } });
      } else if (selected.length === WORDS.reduce((max, w) => Math.max(max, w.length), 0)) {
        dispatch({ type: 'CLEAR_SELECTION' });
      }
    }
  };

  const getWordFromSelection = (cells: [number, number][]): string => {
    if (cells.length < 2) return '';
    
    const sortedCells = [...cells].sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0];
      return a[1] - b[1];
    });

    let word = '';
    sortedCells.forEach(([row, col]) => {
      word += state.grid[row][col].letter;
    });

    const reverseWord = word.split('').reverse().join('');
    return WORDS.includes(word) ? word : WORDS.includes(reverseWord) ? reverseWord : '';
  };

  return (
    <Box className={classes.root}>
      <Typography variant="h4" align="center" gutterBottom>
        Word Search
      </Typography>
      <Grid container spacing={0} justifyContent="center">
        {state.grid.map((row, i) => (
          <Grid container item key={i} justifyContent="center">
            {row.map((cell, j) => (
              <Grid item key={`${i}-${j}`}>
                <Box
                  className={`${classes.gridCell} ${
                    cell.isSelected ? classes.selected : ''
                  } ${cell.isFound ? classes.found : ''}`}
                  onClick={() => handleCellClick(i, j)}
                >
                  {cell.letter}
                </Box>
              </Grid>
            ))}
          </Grid>
        ))}
      </Grid>
      <Paper className={classes.foundWords}>
        <Typography variant="h6">Found Words</Typography>
        <List>
          {state.foundWords.map((word, index) => (
            <ListItem key={index}>
              <ListItemText primary={word} />
            </ListItem>
          ))}
        </List>
        <Typography variant="body2">
          Words to find: {WORDS.join(', ')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default App;