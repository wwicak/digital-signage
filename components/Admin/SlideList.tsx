import React, { Component, memo } from 'react'
import ContentLoader from 'react-content-loader'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import SlideCard, { ExtendedSlideData } from './SlideCard'
import { getSlides } from '../../actions/slide'
import { reorderSlides } from '../../actions/slideshow'

// Sortable Item Component using @dnd-kit
interface SortableItemProps {
  id: string;
  value: ExtendedSlideData;
  refresh: () => void;
}

const SortableItem = memo(function SortableItem({ id, value, refresh }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SlideCard value={value} refresh={refresh} />
    </div>
  )
})

// Sortable List Component using @dnd-kit
interface SortableListProps {
  items: ExtendedSlideData[];
  refresh: () => void;
  onDragEnd: (event: DragEndEvent) => void;
}

const SortableList = memo(function SortableList({ items, refresh, onDragEnd }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2, // Minimum distance to drag before sorting starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div className={'slide-list-container'}>
        <div className={'timeline-decorator'} />
        <SortableContext items={items.map(item => item._id || `item-${items.indexOf(item)}`)} strategy={verticalListSortingStrategy}>
          {items.map((value, index) => (
            <SortableItem
              key={value._id || `item-${index}`}
              id={value._id || `item-${index}`}
              value={value}
              refresh={refresh}
            />
          ))}
        </SortableContext>
        
      </div>
    </DndContext>
  )
})

export interface ISlideListProps {
  slideshowId: string;
}

interface ISlideListState {
  slides: ExtendedSlideData[] | null;
  error?: string | null;
}

class SlideList extends Component<ISlideListProps, ISlideListState> {
  constructor(props: ISlideListProps) {
    super(props)
    this.state = {
      slides: null,
      error: null,
    }
  }

  componentDidMount() {
    this.fetchSlides()
  }
  
  componentDidUpdate(prevProps: ISlideListProps) {
    if (this.props.slideshowId !== prevProps.slideshowId) {
      this.fetchSlides()
    }
  }

  fetchSlides = (): void => {
    const { slideshowId } = this.props
    if (!slideshowId) {
        this.setState({slides: [], error: 'Slideshow ID is missing.'})
        return
    }
    this.setState({slides: null, error: null})
    getSlides(slideshowId)
      .then(slides => {
        this.setState({
          slides: slides.map((slide, index) => ({...slide, order: index })) as ExtendedSlideData[],
        })
      })
      .catch(error => {
        console.error('Failed to fetch slides:', error)
        this.setState({ slides: [], error: 'Failed to load slides.' })
      })
  }

  // Handle drag end event from @dnd-kit
  handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const { slideshowId } = this.props

    if (active.id !== over?.id && this.state.slides) {
      const slides = this.state.slides
      const oldIndex = slides.findIndex(slide => (slide._id || `item-${slides.indexOf(slide)}`) === active.id)
      const newIndex = slides.findIndex(slide => (slide._id || `item-${slides.indexOf(slide)}`) === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        this.setState(
          ({ slides }) => ({
            slides: slides ? arrayMove(slides, oldIndex, newIndex) : null,
          }),
          () => {
            // After optimistically updating UI, call API to persist order
            reorderSlides(slideshowId, oldIndex, newIndex)
              .catch(error => {
                console.error('Failed to reorder slides on server:', error)
                // Optionally revert UI change or show error message
                this.fetchSlides() // Re-fetch to get server state
              })
          }
        )
      }
    }
  }

  // refresh method is passed to SlideCard, which might call it after edits/deletes
  refresh = (): void => {
    this.fetchSlides()
  }

  render() {
    const { slides, error } = this.state

    if (error) {
        return <div className='error-message'>{error}</div>
    }

    return slides ? (
      <SortableList
        items={slides}
        refresh={this.refresh}
        onDragEnd={this.handleDragEnd}
      />
    ) : (
      Array(4)
        .fill(0)
        .map((_, index) => (
          <ContentLoader
            key={`loading-slide-${index}`}
            height={100}
            width={640}
            speed={2}
            backgroundColor='#f3f3f3'
            foregroundColor='#ecebeb'
          >
            <rect x='0' y='10' rx='4' ry='4' width='50' height='50' />
            <rect x='60' y='10' rx='3' ry='3' width='300' height='15' />
            <rect x='60' y='30' rx='3' ry='3' width='80' height='10' />
            <rect x='580' y='25' rx='3' ry='3' width='20' height='20' />
            <rect x='610' y='25' rx='3' ry='3' width='20' height='20' />
          </ContentLoader>
        ))
    )
  }
}

export default SlideList