import { BrandPicker } from './BrandPicker';
import { PhotoUploader } from './PhotoUploader';
import { DetailsForm } from './DetailsForm';
import { AddressForm } from './AddressForm';
import type { CardData } from '../types';

export function Inspector({ data }: { data: CardData }) {
  return (
    <div className="inspector">
      <div className="inspector-pad">
        <BrandPicker data={data} />
        <PhotoUploader data={data} />
        <DetailsForm data={data} />
        <AddressForm data={data} />
      </div>
    </div>
  );
}
